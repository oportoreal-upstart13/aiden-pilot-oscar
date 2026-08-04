#!/usr/bin/env bash
# DeskLine graded security smoke suite (§6 of docs/plans/deskline.md).
# Requires the dev server running (npm run dev) and the seeded demo data
# (npm run db:seed) — uses the fixed seed users/password below.
#
# Usage: bash scripts/smoke-test.sh [base_url]
set -uo pipefail

BASE_URL="${1:-http://localhost:3000}"
PASSWORD="Passw0rd!23"
JAR_DIR="$(mktemp -d)"
trap 'rm -rf "$JAR_DIR"' EXIT

PASS=0
FAIL=0

expect() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "PASS  $desc (got $actual)"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $desc (expected $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

login() {
  local email="$1" jar="$JAR_DIR/$2"
  local csrf
  csrf=$(curl -s -c "$jar" "$BASE_URL/api/auth/csrf" | grep -oE '"csrfToken":"[^"]+"' | cut -d'"' -f4)
  curl -s -b "$jar" -c "$jar" -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "email=$email" \
    --data-urlencode "password=$PASSWORD" \
    --data-urlencode "csrfToken=$csrf" \
    --data-urlencode "callbackUrl=$BASE_URL/dashboard" \
    --data-urlencode "json=true" -o /dev/null
  echo "$jar"
}

ticket_id_for() {
  local jar="$1" subject_fragment="$2"
  curl -s -b "$jar" "$BASE_URL/api/tickets" \
    | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).tickets.find(t=>t.subject.includes('$subject_fragment'))?.id ?? ''"
}

echo "=== DeskLine smoke suite against $BASE_URL ==="

ACME_AGENT_JAR=$(login "agent@acme.test" acme_agent)
ACME_AGENT2_JAR=$(login "agent2@acme.test" acme_agent2)
ACME_VIEWER_JAR=$(login "viewer@acme.test" acme_viewer)
GLOBEX_AGENT_JAR=$(login "agent@globex.test" globex_agent)

# --- Probe 1: Cross-tenant GET on a known other-org ticket id -> 404 ---
GLOBEX_TICKET_ID=$(ticket_id_for "$GLOBEX_AGENT_JAR" "webhooks")
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$ACME_AGENT_JAR" "$BASE_URL/api/tickets/$GLOBEX_TICKET_ID")
expect "Probe 1: cross-tenant GET returns 404, not 403/200" 404 "$CODE"

# --- Probe 2: Viewer POST draft -> 403 ---
ACME_TICKET_ID=$(ticket_id_for "$ACME_AGENT_JAR" "reset")
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$ACME_VIEWER_JAR" \
  -X POST "$BASE_URL/api/tickets/$ACME_TICKET_ID/draft" \
  -H "Content-Type: application/json" -d '{}')
expect "Probe 2: Viewer POST draft returns 403" 403 "$CODE"

# --- Probe 3: Agent PATCH another agent's same-org ticket -> 404 ---
ACME_AGENT2_TICKET_ID=$(ticket_id_for "$ACME_AGENT2_JAR" "CSV")
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$ACME_AGENT_JAR" \
  -X PATCH "$BASE_URL/api/tickets/$ACME_AGENT2_TICKET_ID" \
  -H "Content-Type: application/json" -d '{"status":"closed"}')
expect "Probe 3: Agent-on-another-agent's-same-org-ticket returns 404" 404 "$CODE"

# --- Probe 4: Unauthenticated GET /api/tickets -> 401 ---
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/tickets")
expect "Probe 4: Unauthenticated GET /api/tickets returns 401" 401 "$CODE"

# --- Probe 5: Malformed create body -> 400 ---
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$ACME_AGENT_JAR" \
  -X POST "$BASE_URL/api/tickets" \
  -H "Content-Type: application/json" -d '{"subject":""}')
expect "Probe 5: Malformed create body returns 400" 400 "$CODE"

# --- Probe 6: Missing ticket id -> 404, same shape as not-yours ---
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$ACME_AGENT_JAR" \
  "$BASE_URL/api/tickets/does-not-exist-at-all")
expect "Probe 6: Missing ticket id returns 404" 404 "$CODE"

echo "==============================================="
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
