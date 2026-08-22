#!/usr/bin/env bash
#
# DeskLine graded smoke suite — the ten probes of the plan's Request
# perimeter dimension, run with curl against a production build.
#
#   npm run build && npm start -- -p 3100
#   npm run smoke
#
# Probes 1–6 are the spec's. Probes 7–10 are specific to this build's
# multi-org model: a forged cookie, an organization switch by the
# dual-membership consultant, a switch towards a non-member organization,
# and the org-scoped audit viewer.
#
# The suite writes no tickets. Probe 10 needs Globex activity to exist so
# that "no Globex rows appear" means something rather than being vacuously
# true, and it gets that by signing a Globex agent in — which produces an
# `auth.signin` audit row for a Globex-exclusive actor without creating
# any domain data. Audit rows accumulate by design; the plan accepts audit
# history as non-reversible evidence.

set -uo pipefail

BASE="${SMOKE_BASE:-http://localhost:3100}"
PASSWORD="${SEED_PASSWORD:-DeskLine!Seed1}"
JARS="$(mktemp -d)"
trap 'rm -rf "$JARS"' EXIT

PASSED=0
FAILED=0

pass() { PASSED=$((PASSED + 1)); printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
fail() { FAILED=$((FAILED + 1)); printf '  \033[31mFAIL\033[0m  %s\n' "$1"; }

probe() { printf '\n%s\n' "$1"; }

expect_status() { # <label> <expected> <actual>
  if [ "$2" = "$3" ]; then pass "$1 (HTTP $3)"; else fail "$1 — expected HTTP $2, got $3"; fi
}

json() { node -pe "JSON.parse(require('fs').readFileSync(0,'utf8'))$1" 2>/dev/null; }

login() { # <handle> <email>
  local jar="$JARS/$1.txt" token
  rm -f "$jar"
  token=$(curl -s -c "$jar" "$BASE/api/auth/csrf" | json ".csrfToken")
  curl -s -b "$jar" -c "$jar" -X POST "$BASE/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "csrfToken=$token" \
    --data-urlencode "email=$2" \
    --data-urlencode "password=$PASSWORD" \
    --data-urlencode "callbackUrl=$BASE" \
    --data-urlencode "json=true" \
    -o /dev/null -w "%{http_code}"
}

# -b reads the jar, -c writes it back. Both are required on every request,
# not only at login: without -c, a Set-Cookie the server issues mid-session
# is discarded, and any probe asserting on cookie-carried state silently
# tests nothing. That is exactly how probe 8 passed a list against itself.
status() { # <handle> <method> <path> [json body]
  local jar="$JARS/$1.txt"
  if [ $# -ge 4 ]; then
    curl -s -b "$jar" -c "$jar" -X "$2" "$BASE$3" \
      -H "Content-Type: application/json" -d "$4" -o /dev/null -w "%{http_code}"
  else
    curl -s -b "$jar" -c "$jar" -X "$2" "$BASE$3" -o /dev/null -w "%{http_code}"
  fi
}

body() { # <handle> <method> <path>
  local jar="$JARS/$1.txt"
  curl -s -b "$jar" -c "$jar" -X "$2" "$BASE$3"
}

echo "DeskLine smoke suite"
echo "base: $BASE"
echo "date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

if [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/auth/csrf")" != "200" ]; then
  echo
  echo "No server on $BASE. Start one with:"
  echo "  npm run build && npm start -- -p 3100"
  exit 1
fi

echo
echo "signing in…"
for pair in "agent1:agent1@acme.test" "agent2:agent2@acme.test" \
            "viewer:viewer@acme.test" "owner:owner@acme.test" \
            "consultant:consultant@deskline.test" "globex:agent1@globex.test"; do
  handle="${pair%%:*}"; email="${pair#*:}"
  code=$(login "$handle" "$email")
  if [ "$code" = "302" ] || [ "$code" = "200" ]; then
    echo "  $email -> $code"
  else
    echo "  $email -> $code (FAILED TO SIGN IN)"; FAILED=$((FAILED + 1))
  fi
done

# The Globex sign-in above is probe 10's setup: it puts an audit row in the
# table whose actor belongs exclusively to Globex.

ACME_A1=tkt_acme_1      # owned by agent1@acme.test
ACME_A2=tkt_acme_3      # owned by agent2@acme.test
GLOBEX=tkt_globex_1

probe "1. unauthenticated GET /api/tickets"
expect_status "anonymous read is refused" 401 \
  "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/tickets")"

probe "2. malformed create body"
expect_status "empty subject and body are rejected" 400 \
  "$(status agent1 POST /api/tickets '{"subject":"","body":""}')"

probe "3. Acme agent requests a Globex ticket"
expect_status "cross-tenant read looks like a missing row" 404 \
  "$(status agent1 GET "/api/tickets/$GLOBEX")"

probe "4. agent A patches agent B's same-org ticket"
expect_status "same-org, not-yours mutation is refused" 404 \
  "$(status agent1 PATCH "/api/tickets/$ACME_A2" '{"status":"pending"}')"

probe "5. nonexistent id, compared byte for byte against not-yours"
NOT_YOURS=$(body agent1 GET "/api/tickets/$ACME_A2")
MISSING=$(body agent1 GET "/api/tickets/tkt_definitely_not_real")
FOREIGN=$(body agent1 GET "/api/tickets/$GLOBEX")
expect_status "nonexistent id is 404" 404 \
  "$(status agent1 GET /api/tickets/tkt_definitely_not_real)"
if [ "$NOT_YOURS" = "$MISSING" ] && [ "$MISSING" = "$FOREIGN" ]; then
  pass "not-yours, missing and cross-tenant bodies are identical: $MISSING"
else
  fail "bodies differ — not-yours=[$NOT_YOURS] missing=[$MISSING] foreign=[$FOREIGN]"
fi

probe "6. viewer posts to /draft"
expect_status "viewer may read the ticket" 200 "$(status viewer GET "/api/tickets/$ACME_A1")"
expect_status "viewer is denied the AI action" 403 \
  "$(status viewer POST "/api/tickets/$ACME_A1/draft" '{"tone":"neutral"}')"

probe "7. Acme user forges the deskline_org cookie towards Globex"
FORGED=$(curl -s -b "$JARS/agent1.txt" -H "Cookie: deskline_org=org_globex" "$BASE/api/tickets")
FORGED_ORG=$(printf '%s' "$FORGED" | json ".activeOrgId")
FORGED_FOREIGN=$(printf '%s' "$FORGED" | json ".tickets.filter(t=>t.id.startsWith('tkt_globex')).length")
if [ "$FORGED_ORG" = "org_acme" ] && [ "$FORGED_FOREIGN" = "0" ]; then
  pass "forged cookie grants nothing — activeOrgId=$FORGED_ORG, Globex rows=$FORGED_FOREIGN"
else
  fail "forged cookie leaked — activeOrgId=$FORGED_ORG, Globex rows=$FORGED_FOREIGN"
fi

probe "8. dual-membership consultant switches organization"
BEFORE_JSON=$(body consultant GET /api/tickets)
BEFORE_ORG=$(printf '%s' "$BEFORE_JSON" | json ".activeOrgId")
BEFORE=$(printf '%s' "$BEFORE_JSON" | json ".tickets.map(t=>t.id).sort().join(',')")
SWITCH=$(status consultant POST /api/orgs/switch '{"orgId":"org_globex"}')
expect_status "switch to a member organization succeeds" 200 "$SWITCH"
AFTER_JSON=$(body consultant GET /api/tickets)
AFTER_ORG=$(printf '%s' "$AFTER_JSON" | json ".activeOrgId")
AFTER=$(printf '%s' "$AFTER_JSON" | json ".tickets.map(t=>t.id).sort().join(',')")

# The switch has to be observable before disjointness means anything.
if [ "$BEFORE_ORG" = "org_acme" ] && [ "$AFTER_ORG" = "org_globex" ]; then
  pass "the active organization actually changed ($BEFORE_ORG -> $AFTER_ORG)"
else
  fail "the switch did not take effect — activeOrgId went $BEFORE_ORG -> $AFTER_ORG"
fi

# Non-vacuity first: two empty sets are trivially disjoint, so a bare
# overlap check would report success for having compared nothing.
COUNTS=$(node -pe "
  const a=process.argv[1]?process.argv[1].split(','):[];
  const b=process.argv[2]?process.argv[2].split(','):[];
  [a.length, b.length, a.filter(x=>x&&b.includes(x)).length].join(' ')" "$BEFORE" "$AFTER")
read -r BEFORE_N AFTER_N OVERLAP <<< "$COUNTS"

if [ "$BEFORE_N" -eq 0 ] || [ "$AFTER_N" -eq 0 ]; then
  fail "disjointness is vacuous — before has $BEFORE_N ticket(s), after has $AFTER_N"
elif [ "$OVERLAP" = "0" ]; then
  pass "$BEFORE_N Acme ticket(s) and $AFTER_N Globex ticket(s), zero in common"
else
  fail "$OVERLAP ticket(s) appear in both organizations — before=[$BEFORE] after=[$AFTER]"
fi
# leave the consultant back where they started
status consultant POST /api/orgs/switch '{"orgId":"org_acme"}' > /dev/null

probe "9. switch towards an organization the caller does not belong to"
expect_status "non-member switch is indistinguishable from a missing org" 404 \
  "$(status agent1 POST /api/orgs/switch '{"orgId":"org_globex"}')"

probe "10. Acme owner reads the org-scoped audit viewer"
AUDIT=$(body owner GET /api/admin/audit)
AUDIT_CODE=$(status owner GET /api/admin/audit)
expect_status "owner may read the audit trail" 200 "$AUDIT_CODE"
FOREIGN_META=$(printf '%s' "$AUDIT" | json ".entries.filter(e=>e.metadata&&e.metadata.orgId&&e.metadata.orgId!=='org_acme').length")
TOTAL=$(printf '%s' "$AUDIT" | json ".entries.length")
ACTOR_SCOPED=$(printf '%s' "$AUDIT" | json ".entries.filter(e=>e.attribution==='actor').length")
if [ "$FOREIGN_META" = "0" ]; then
  pass "no domain event from another organization ($TOTAL entries, $ACTOR_SCOPED attributed by actor)"
else
  fail "$FOREIGN_META domain event(s) from another organization leaked into the viewer"
fi
# The Globex agent signed in at the top of this run. Their audit row must
# not be here: they belong to Globex only. The consultant's rows are
# expected — she is a member of Acme too, and denial/auth events carry no
# organization (F9), so actor is the only handle on them.
# GET /api/me returns the user flat — {"id":…,"email":…} — with no `user`
# wrapper. Read from the route before consuming it; assuming a shape is
# what made this probe report "vacuous" on its first real run.
GLOBEX_ONLY_ID=$(body globex GET /api/me 2>/dev/null | json ".id" || true)
if [ -n "${GLOBEX_ONLY_ID:-}" ] && [ "$GLOBEX_ONLY_ID" != "undefined" ]; then
  LEAKED=$(printf '%s' "$AUDIT" | node -pe "
    const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
    d.entries.filter(e=>e.actorId===process.argv[1]).length" "$GLOBEX_ONLY_ID")
  if [ "$LEAKED" = "0" ]; then
    pass "no row whose actor belongs exclusively to Globex (checked by id $GLOBEX_ONLY_ID)"
  else
    fail "$LEAKED row(s) from a Globex-only actor leaked into Acme's viewer"
  fi
else
  fail "could not resolve the Globex agent's id — probe 10 would be vacuous"
fi

printf '\n────────────────────────────────────────\n'
printf 'passed: %d   failed: %d\n' "$PASSED" "$FAILED"
[ "$FAILED" -eq 0 ] || exit 1
