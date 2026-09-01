## Security Review Report

**Branch:** `certification`
**Base:** `9245060` — the `aiden-cli init` scaffold. There is no `develop`
branch in this repository; `certification` is an orphan history whose first
commit is the untouched starter, so diffing against it is the exact
equivalent of "everything this build added".
**Reviewed:** 2026-08-22
**Changed files:** 81 (51 `.ts` / `.tsx`)
**Reviewer:** Claude Code (automated)

---

### Code Analysis

| Category               | Status  | Findings                                                                                |
| ---------------------- | ------- | --------------------------------------------------------------------------------------- |
| Auth & Access Control  | PASS    | Every API route authenticates. One acknowledged exception, one route re-verified by hand |
| Injection Prevention   | PASS    | No issues                                                                               |
| Data Exposure          | PASS    | One HIGH found and resolved during the review — see Detailed Findings                   |
| Stripe Security        | N/A     | Billing is disabled in `aiden.config.ts`; no Stripe code exists                         |
| Server/Client Boundary | PASS    | No issues; two grep hits investigated and dismissed                                     |
| Sensitive Data         | PASS    | No issues                                                                               |

### Dependency Vulnerabilities

| Source       | Critical | High | Medium | Low |
| ------------ | -------- | ---- | ------ | --- |
| npm audit    | 0        | 0    | 0      | 0   |
| osv-scanner  | 0        | 0    | 0      | 0   |

`osv-scanner --lockfile package-lock.json` reports no vulnerabilities across
the resolved tree. This is the same scan that flagged **GHSA-ggr8-5vv4-36mx**
(deepmerge-ts 7.1.5, CVSS 8.2, stack exhaustion on recursive object graphs) at
the start of the build. It is clear now because of the `overrides` entry
described below.

### New Package CVE Check

**No packages were added or upgraded.** The complete dependency delta between
the scaffold and `HEAD` is:

```
+  "overrides": { "deepmerge-ts": "^8.0.1" }
```

plus a project rename and two npm scripts (`test`, `smoke`). No new runtime or
dev dependency was introduced — the test suite deliberately runs on Node's
built-in runner precisely so that nothing had to be installed (see
`.claude/fixes/testing.md`).

- `deepmerge-ts@8.0.2` (resolved via the override): **CLEAR.** This entry is
  not a new dependency but the *remediation* of a transitive CVE. deepmerge-ts
  enters through `prisma → @prisma/config`, which pins 7.1.5; the override
  forces 8.x, where the advisory is fixed. Verified against the resolved
  lockfile by osv-scanner rather than by a web search, which is the stronger
  evidence — it scans the versions actually installed.

### Detailed Findings

- **[HIGH · RESOLVED] Data Exposure — `src/app/api/tickets/route.ts:63,91`** —
  `POST /api/tickets` returned the full Prisma model from both
  `prisma.ticket.create()` and the post-triage `prisma.ticket.update()`. Every
  other route that returns a ticket projects through `ticketDetailSelect`,
  which deliberately omits `orgId`; these two did not, so the create response
  leaked the caller's `orgId` into the payload.

  Real-world impact is low — the organization is the caller's own and appears
  as `activeOrgId` in the list response anyway — but it is a genuine break in
  the projection discipline applied everywhere else, and the class of bug is
  the one that matters: a response shape that grows silently whenever a column
  is added to the model. A field added to `Ticket` tomorrow would have started
  appearing in this response with nobody deciding that it should.

  **Resolved, not justified.** Both queries now use `ticketDetailSelect`.
  `tsc`, `lint` and `build` re-run at zero afterwards.

- **[ACKNOWLEDGED EXCEPTION] Auth — `src/app/api/auth/register/route.ts`** —
  the only route with no `auth()` / `withAuth`, which is correct: it is
  self-service registration and must be reachable by an anonymous caller. It
  is not unguarded — `withRateLimit` caps it at 5 requests per minute per
  client IP, with the IP derivation failing closed to a shared bucket so a
  missing header cannot bypass the limit. Noted as an exception rather than a
  finding, per this review's own rules.

- **[VERIFIED, NOT A FINDING] Auth — the `/admin` segment guard** — worth
  recording because this build changed it. `src/app/admin/layout.tsx` was
  rewritten in phase 6 from a global-ability gate to a coarse "administers
  something" gate, which admits any owner of any organization. That segment
  also contains the starter's **cross-tenant** user administration
  (`/admin/users`), so the relaxed layout could in principle have exposed it.
  It does not: `src/app/admin/users/page.tsx:13`,
  `src/app/api/admin/users/route.ts:9` and
  `src/app/api/admin/users/[id]/roles/route.ts:19` each enforce
  `users.manage` themselves. The layout is a backstop, not the gate. No seeded
  persona holds `users.manage`.

- **[VERIFIED, NOT A FINDING] Query scoping** — 39 Prisma calls across the app
  and API surfaces. Two are unscoped by design and both are correct:
  `prisma.role.findMany()` on the starter's users page (global reference data,
  not tenant data) and `prisma.user.count()` in its last-admin guard (a global
  count, on a globally-gated route). Every query touching `Ticket`,
  `Membership`, `AIUsage` or `AuditLog` is scoped by `orgId`, by `userId`, or
  by an id already filtered by one of those.

- **[DISMISSED] Server/Client Boundary — two grep hits** — `src/lib/security.ts`
  and `src/lib/validations/tickets.ts` matched a search for `"use client"`.
  Both matches are the literal string inside a *comment* explaining what must
  not import them; neither file carries the directive, and `security.ts` opens
  with `import "server-only"`. The ten genuine client components were checked
  individually and none imports `@prisma/client`, `bcryptjs`, `node:*`, or any
  `src/lib` module that instantiates a server client. The create-ticket dialog
  imports `CreateTicketBody` from `src/lib/validations/tickets.ts`, which is
  pure Zod with no SDK imports — that separation was the point of deviation D2.

### Checks that returned nothing

- `$executeRawUnsafe`, `$queryRawUnsafe`, `eval(`, `new Function(`,
  `dangerouslySetInnerHTML`: **zero occurrences** in `src/` outside generated
  code.
- Unvalidated request bodies: **zero**. No route calls `request.json()`
  directly; every body goes through `parseRequest` with a Zod schema, and
  every search param through `parseQuery`.
- `console.log` / `console.error` / `console.warn`: **zero** in `src/`. All
  logging goes through `src/lib/logger.ts`, whose default redaction covers
  `password`, `token`, `apiKey`, `cookie` and `authorization`.
- Secrets in the diff (`sk_live_`, `sk_test_`, `whsec_`, PRIVATE KEY blocks,
  SendGrid `SG.`, JWTs, `gsk_`, `xai-`, `sk-ant-`): **zero matches** across the
  full 81-file diff. `.env.local` is untracked and `.gitignore` covers
  `.env`, `.env*.local`, with `!.env.example` as the only exception.
- `NEXT_PUBLIC_*`: four, all branding — `APP_NAME`, `APP_DESCRIPTION`,
  `APP_TAGLINE`, `APP_COPYRIGHT`. No secrets.

---

### Verdict: PASS

Zero CRITICAL findings. One HIGH was found and resolved inside this review
rather than deferred, and the fix was re-verified through `tsc`, `lint` and
`build`. Zero CRITICAL or HIGH dependency vulnerabilities: both `npm audit`
and `osv-scanner` are clean against the resolved lockfile, including the
transitive CVE that the `overrides` entry exists to close.

Two things this verdict does **not** claim, and should be read alongside it.
First, this build's most security-relevant behaviour — tenant isolation — is
not established by static analysis but by the ten-probe smoke suite and the
route-handler tests, which exercise cross-tenant reads, a forged organization
cookie, and role-based denial against a running production build
(`docs/evidence/suites-2026-08-22-green.txt`). Second, the prompt-injection
containment on the AI surface is an empirical result against one payload and
one model on one date, not a guarantee
(`docs/evidence/injection-probe-2026-08-21.txt`).

---

## Addendum · 2026-09-01 · two mysql2 advisories published after this review

The scan table above reported 0/0/0/0 and was accurate on 2026-08-22. It did
not stay accurate, and the reason is worth stating plainly: **a clean scan is
true on its date and nowhere else.** Two advisories against `mysql2@3.15.3`
were published *after* this review ran —

| Advisory              | Severity | Fixed in | Published  |
| --------------------- | -------- | -------- | ---------- |
| GHSA-3f6p-5ww8-9rcr   | HIGH     | 3.22.0   | 2026-08-31 |
| GHSA-rgwj-5xj2-c3m3   | MODERATE | 3.23.1   | 2026-09-01 |

The HIGH is an auth-plugin downgrade to `mysql_clear_password` that leaks the
plaintext credential. By 2026-09-01 `npm audit` reported 2 HIGH — one for
`mysql2`, one for `prisma` as its dependent.

**Exposure here was nil, and that is the honest framing rather than a
mitigation.** `mysql2` reaches this tree only through `prisma`, which pins it
at exactly `3.15.3` for its MySQL connector. DeskLine is PostgreSQL via
`@prisma/adapter-pg`; there is no MySQL datasource, no MySQL connection string,
and no reference to `mysql` anywhere in `src/`, `prisma/`, `scripts/` or
`aiden.config.ts`. The module is never loaded at runtime. The advisories were
therefore a supply-chain finding to clear, not an exploitable path to close —
but "unreachable" is an argument that stops being true the moment someone adds
a MySQL datasource, so it is not a reason to leave it.

**Fix:** an `overrides` entry forcing `mysql2` to `^3.24.2`, the same mechanism
already used for `deepmerge-ts`. Resolved 3.15.3 → 3.24.2.

**Verified after the change:**

```
npm audit                                   found 0 vulnerabilities
osv-scanner --lockfile package-lock.json    No issues found (934 packages)
```

The lockfile delta is confined to the `mysql2` subtree — `denque`, `seq-queue`
and `sqlstring` out, `sql-escaper` in, four packages, 23 insertions / 30
deletions. Zero lines mentioning `@upstart13-com`, checked explicitly, because
overriding a version `prisma` pins exactly is the kind of change that can
quietly drag other resolutions with it.

`tsc --noEmit` clean, `eslint` clean, `npm run build` green with
`ƒ Proxy (Middleware)` present in the route manifest, **40/40** tests and
**16/16** smoke probes passing against a production build on the rebuilt tree.

**What this addendum does not claim.** It does not make the table above current
for any date after 2026-09-01. Nothing in this repository re-runs these
scanners; the next advisory will land the same way this one did — silently,
against a green report. That is the argument for the CI item, not for a
stronger claim here.
