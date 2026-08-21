# DeskLine — Implementation Plan (Seven Dimensions)

**Candidate:** Oscar Portorreal (oscarportorreal@gmail.com)
**Target level:** AIDEN Certified — Associate (App Engineer)
**Repository:** `aiden-pilot-oscar`
**Status:** v2 — revised after a read-only reality check against the installed
packages. Pending approval.
**Written:** 2026-08-21

> **Approval marker:** _pending_ — to be recorded via a server-timestamped event
> (Jira / Confluence / PR approval) by the assigned reviewer, after this plan
> commit is pushed to the reviewer-visible remote. For a graded attempt, this
> approval must **predate the first DeskLine code commit** on the remote.
>
> **UI pre-flight commitment** (to be performed and dated **before the first UI
> commit**): read `docs/design-system/00-overview.md` and the specific DS files
> for the components touched — `01-foundations`, `05-data-display` (tables,
> badges), `07-feedback` (toasts, streaming states), `08-page-layouts`
> (PageHeader, detail layout). The `/frontend-design` skill mandated by
> `CLAUDE.md` **is not shipped in this installation** (verified — see Pre-build
> findings F4); the DS files are therefore the pre-flight source, and the gap is
> recorded as a fix entry.
>
> **Deviation log:** _(empty at approval time — every deviation surfaced during
> the build is appended here with a date and root cause; none is silently
> absorbed)_

---

## 0. Pre-build findings (2026-08-21)

Before this plan was finalised, the repository and the installed
`@upstart13-com/aiden-*` packages were read end to end. These findings shaped the
plan; they are recorded here because a plan written against assumed APIs is a
plan that generates deviations later.

| #       | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Consequence for this plan                                                                                                                                                                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1**  | **`npx aiden` resolves to `aiden@0.0.3`, an unrelated third-party npm package** — not the Upstart13 CLI. The real CLI is `@upstart13-com/aiden-cli` on GitHub Packages. `CLAUDE.md` line 26 documents the unscoped command, which is what pulls the foreign package.                                                                                                                                                                                                                                                                             | Blocking for Capability A. The scoped CLI must be installed with a `read:packages` PAT in `.npmrc` before any doctor/upgrade evidence is captured. All commands use the scoped name. Recorded as fix entry `aiden-cli.md`.                                                                              |
| **F2**  | **`tsc --noEmit` failed on the arrival tree (7 errors).** Six came from `aiden.config.ts` and `src/lib/ai.ts` disagreeing about the provider config shape; the seventh was a pre-existing template issue — `footerLinks: []` under `as const` yields `readonly []`, unassignable to `SiteFooterLink[]`.                                                                                                                                                                                                                                          | Both resolved before the first DeskLine commit. The config shape is settled by F12 below; the `readonly` error is fixed at the consumer (`links={[...aidenConfig.app.footerLinks]}`) so the config literal stays JSON-pure. Green `tsc` is a precondition of the first build commit, not later cleanup. |
| **F3**  | **`setAIUsageSink` does fire on streaming.** `createAIStreamResponse` calls `stream.finalResponse()` internally, which reaches `reportUsage()` → the sink. With the **Anthropic** adapter the counts are real (`promptTokens` from `message_start`, `completionTokens` from `message_delta`). With the **OpenAI** adapter they are always zero, because `toRequest` never sets `stream_options: { include_usage: true }`.                                                                                                                        | The estimated-usage fallback contemplated in v1 is **dropped from scope** — DeskLine ships on Anthropic, where the numbers are real. The OpenAI gap is documented as an upstream finding (`aiden-ai.md`), not worked around.                                                                            |
| **F4**  | **The `/frontend-design` skill does not exist** in this installation. `.claude/commands/` holds six commands; none is it. `CLAUDE.md` mandates it before any UI.                                                                                                                                                                                                                                                                                                                                                                                 | The DS-file contingency activates from day one, not as a hypothetical. Recorded as a fix entry.                                                                                                                                                                                                         |
| **F5**  | **`AIUsageRecord` carries no `route` and no `orgId`**, and `getRequestContext()` returns only `{ requestId, userId }`.                                                                                                                                                                                                                                                                                                                                                                                                                           | The app owns a `requestId → { route, orgId }` map, populated immediately before each AI call and cleared in a `finally`. Correlation is explicit app state, not an SDK feature.                                                                                                                         |
| **F6**  | **`assertOwnership<T extends { id?: string; userId: string }>`** compares a literal `resource.userId`. `Ticket` uses `ownerId` per the spec's frozen model.                                                                                                                                                                                                                                                                                                                                                                                      | A single mapping helper adapts the row to the ownership contract. See Dimension 4.                                                                                                                                                                                                                      |
| **F7**  | **`defineAbilities`'s `{ roles: [...] }` shorthand reads `session.user.roles`** — NextAuth's global roles — not `Membership.role`.                                                                                                                                                                                                                                                                                                                                                                                                               | Every org-scoped rule is an `AbilityPredicate` receiving the active membership as the resource. The shorthand is used only for the starter's own global-admin rules.                                                                                                                                    |
| **F8**  | **`createAuditReader`'s filters are `{ userId?, event?, from?, to? }`** — no metadata hook, so no org filter. Worse: the shipped `src/app/api/admin/audit/route.ts` calls `auditReader.list()` **with no org scope at all**, leaking audit rows across tenants to any admin.                                                                                                                                                                                                                                                                     | The org-scoped viewer queries `prisma.auditLog` directly. The existing route is rewritten, not extended. The missing filter is raised upstream per `CLAUDE.md`.                                                                                                                                         |
| **F9**  | **Auto-emitted denial events** (`security.ownership_failed`, `security.ability_denied`) are emitted from inside the package with fixed metadata (`reason`, `actorUserId`, `action`, `actorRoles`) — **no `orgId`**.                                                                                                                                                                                                                                                                                                                              | An audit viewer filtering only on `metadata->>'orgId'` would hide every denied attempt. The viewer therefore unions two predicates. See Dimension 5.                                                                                                                                                    |
| **F10** | **`responseSchema` is never sent to Anthropic.** The adapter omits it from the request and `JSON.parse`s the reply afterwards, silently leaving `parsed: undefined` on failure. OpenAI does send `response_format: { type: "json_schema", strict: true }`, which requires `additionalProperties: false` and every property in `required`.                                                                                                                                                                                                        | Triage's guarantee is app-level: an explicit JSON-shape instruction in the system prompt, `temperature: 0`, Zod validation, and a defined degradation path. The SDK gap is documented rather than claimed away.                                                                                         |
| **F11** | **`securityHeaders` lives only at `@upstart13-com/aiden-security/middleware`** and is a factory that must be called. Next 16 uses `proxy` as the middleware filename. Neither `src/proxy.ts` nor `middleware.ts` exists today — **the app currently serves no security headers.**                                                                                                                                                                                                                                                                | `src/proxy.ts` is a file to create, not edit.                                                                                                                                                                                                                                                           |
| **F12** | **`aiden doctor` only recognises boolean provider flags.** With the starter's shipped `ai.providers.<name>: { enabled, model }` object shape, doctor reports the config as valid (step 1 ✓) while treating every provider as disabled — it silently stops requiring that provider's API key. Observed 2026-08-21: doctor's required-var count dropped from 3 to 2 on nothing but that shape change, with no warning. A clone missing `ANTHROPIC_API_KEY` would pass doctor green and fail at runtime — the inverse of what the check exists for. | `ai.providers` uses booleans so the env gate stays honest; model pinning moves to a sibling `ai.models`, and `ai.defaultProvider` selects the live provider. `src/lib/ai.ts` is realigned to read from both. Recorded as fix entry `aiden-cli.md`.                                                      |

**Provenance note.** Every finding above was observed in this repository against
its own installed packages. No configuration, comment, or fix entry is carried
in from another candidate's build.

---

## 1. How this build differs

| Decision                                                                                         | Why                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Real multi-org** — a user may belong to several orgs, with the active org resolved per request | The spec only requires `@@unique([orgId, userId])`. Capping users at one org makes tenant isolation trivial rather than demonstrable.                                                                                       |
| **Audit viewer that shows denials**                                                              | F9 means the naive org-scoped viewer hides exactly the evidence a security reviewer wants. Unioning domain events with actor-scoped denial events is the difference between an audit page and an audit page that is useful. |
| **Route-handler-level tests**, not only pure-function tests                                      | Pure-function tests never exercise the perimeter. A broken pipeline order or a missing auth wrapper is invisible to them.                                                                                                   |

---

## 2. Outcome

User-visible behaviour per persona. No implementation detail.

- **Any authenticated member** signs in with credential auth (`LoginForm` /
  `RegisterForm` from `aiden-auth`) and lands on a dashboard listing **only the
  tickets of their active organization**, with status and priority.
- **A user who belongs to more than one organization** sees an org switcher in
  the header. Switching changes everything they see — tickets, members, audit
  trail, cost. They can never select an organization they do not belong to, and
  attempting to force one does not reveal that it exists.
- **Agents** create tickets (subject + body). On create the AI
  **auto-classifies** it: priority, category and sentiment appear without agent
  input. Agents update and close **only tickets they own or are assigned**. On a
  ticket's detail page they click **"Draft reply"** and watch an AI-written
  customer reply **stream in token by token**; they pick the tone, copy it, and
  edit it before sending.
- **Viewers** see their organization's tickets read-only. Any mutation or AI
  action is denied — the control renders disabled or absent, and the denial is
  enforced server-side regardless.
- **Owners** additionally reach `/admin`: member role management, an org-scoped
  audit viewer **that includes denied attempts by their own members**, and an AI
  spend view broken down per user.
- **Cross-tenant access behaves as if the resource does not exist.** A user in
  Acme can never observe that a Globex ticket id exists.
- **When AI is unavailable**, the ticket is still created — unclassified — and
  the draft panel shows a readable error. AI is an enhancement, never a gate.

**Informational targets** (not graded gates): median latency to first SSE token
< 2s and cost per draft ≤ $0.05, over ≥5 calls against the seeded dataset, read
from `AIUsage` rows. These are meaningful only against Anthropic; a local model
would report zero cost and the target would be vacuous.

---

## 3. Data

Every model is authored as a fragment under `prisma/fragments/` and composed with
`npx aiden-db-merge-schema`. **`prisma/schema.prisma` and
`src/generated/prisma/**` are never hand-edited\*\* — that is an auto-fail.

| Fragment            | Model                 | Key fields                                                                                                                                                  | Relations / hygiene                                                                                                                         |
| ------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `org.prisma`        | `Org`                 | `id (cuid)`, `name`, `createdAt`                                                                                                                            | `memberships Membership[]`, `tickets Ticket[]`                                                                                              |
| `membership.prisma` | `Membership`          | `orgId`, `userId`, `role` (`owner\|agent\|viewer`), `createdAt`                                                                                             | FKs to `Org` and `User`, `onDelete: Cascade`; `@@unique([orgId, userId])`; `@@index([userId])`; `@@index([orgId])`                          |
| `ticket.prisma`     | `Ticket`              | `orgId`, `ownerId`, `subject`, `body`, `status` (`open\|pending\|closed`, default `open`), `priority?`, `category?`, `sentiment?`, `createdAt`, `updatedAt` | FKs to `Org` and `User("TicketOwner")`, `onDelete: Cascade`; `@@index([orgId])`; `@@index([ownerId])`; composite `@@index([orgId, status])` |
| `aiusage.prisma`    | `AIUsage`             | `orgId`, `userId`, `route`, `provider`, `model`, `promptTokens`, `completionTokens`, `costUsd Decimal(10,6)`, `createdAt`                                   | `@@index([orgId])`; `@@index([userId])`; `@@index([createdAt])`                                                                             |
| `user.prisma`       | (back-relations only) | —                                                                                                                                                           | `memberships Membership[]`; `tickets Ticket[] @relation("TicketOwner")`                                                                     |

**`AuditLog` is reused from the `audit.prisma` fragment shipped by `aiden-db`.**
It is **not redefined**. Written via `auditLog()`, read org-scoped in the viewer.

### Deliberate modelling decisions

- **`Ticket.ownerId` keeps the spec's name** even though `assertOwnership`
  expects a literal `userId` (F6). Fidelity to the frozen model beats
  convenience; the adaptation lives in one helper, described in Dimension 5.
- **`AIUsage` keeps its spec name** even though Prisma generates the awkward
  `prisma.aIUsage` accessor. Renaming to `AiUsage` would read as a silent
  deviation from a model the spec spells out.
- **`provider String` is added to `AIUsage`.** The sink's record reports the
  provider; without persisting it, comparing cost across providers after the
  live switch is impossible — and that switch is graded (Capability E).
- **`costUsd` is a `Decimal`**, which the driver adapter returns as
  `Prisma.Decimal`. Every route serialising it converts explicitly
  (`Number(row.costUsd)`); a raw Decimal in `NextResponse.json()` does not
  round-trip.
- **No `@@unique([userId])` on `Membership`.** Capping a user at one org would
  make any unordered `findFirst({ where: { userId } })` safe, but removes the
  case that makes multi-tenancy worth demonstrating. Instead, **no query resolves
  the caller's organization implicitly** — it is resolved once per request and
  passed explicitly downward.

### Migrations

1. **`deskline_core`** — the four models, indexes and FKs, via
   `npm run db:migrate`.
2. **`deskline_audit_org_index`** — expression index over `AuditLog.metadata` for
   the viewer's org-scoped predicate. `metadata` is `Json?` → `jsonb`, so the
   index is viable. Added as raw SQL inside a migration; **the `AuditLog` model
   is not touched** — adding a database index is not redefining the fragment.
   Verified with `EXPLAIN`; at seed scale the planner may prefer a sequential
   scan, so the check runs with `enable_seqscan off` and that condition is stated
   honestly rather than hidden. The same migration confirms an index exists to
   serve the actor-scoped predicate (F9); one is added if the shipped fragment
   does not provide it.

### Seed (`prisma/seed.ts`)

Idempotent, against a throwaway local database.

- **Two organizations:** Acme Corp and Globex Inc.
- **Per organization:** one `owner`, two `agents`, one `viewer`.
- **One dual-membership user** — a consultant agent belonging to Acme **and**
  Globex with a different role in each. The living proof of multi-org and the
  subject of the org-switch probes.
- **~6 tickets per organization**, across statuses and owners.
- **One ticket with a malicious body** attempting to override and echo the system
  prompt — subject of the adversarial injection probe.
- Starter roles and permissions seeded from `src/config/rbac.ts`.
- All users share a seed password so the curl suite can authenticate each
  persona.

---

## 4. Permissions

Three roles via `defineAbilities({...})` in `src/lib/abilities.ts`, seeded in
`prisma/seed.ts`.

**Every org-scoped rule is an `AbilityPredicate`, not the `{ roles: [...] }`
shorthand.** The shorthand intersects against `session.user.roles` — NextAuth's
_global_ roles — while DeskLine's roles live in `Membership.role` and differ per
organization for the same user (F7). The active membership is passed as the
ability resource and the predicate decides on its `role`. The shorthand is
retained only for the starter's own global-admin rules, which genuinely are
global.

| Route group                         | Primitive                                                     | Rationale                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Ticket read (list/get)              | query-level org filter; ownership step applies to agents only | Ownership is the natural boundary for an agent; org-wide read for owner/viewer is a role fact, not a predicate |
| Ticket mutate (create/update/close) | ownership step + `assertCan`                                  | Both needed: the row must be theirs (404) **and** the role must permit mutation (403 for viewer)               |
| AI actions (draft/classify)         | `assertCan` after ownership                                   | AI is a privileged action on an owned row                                                                      |
| `/admin/*`                          | `assertCan` (owner only)                                      | A pure role gate; no ownership predicate applies                                                               |
| Organization switch                 | ownership step on the membership                              | A membership question, not a role question: any role may switch to an org they belong to                       |

**Rejected as unneeded — 1:** CASL-style conditional abilities
(`can('update', 'Ticket', { ownerId: user.id })`). Row ownership is already
enforced in the canonical perimeter step; duplicating it as an ability condition
creates a second authority over the same fact, and two authorities over a
security fact drift apart eventually.

**Rejected as unneeded — 2:** a fourth `admin` role distinct from `owner`. The
spec freezes three personas and nothing in scope distinguishes them.

**Rejected as unneeded — 3:** mirroring the org role into the NextAuth JWT so the
`{ roles: [...] }` shorthand could be used. It would make the rules terser at the
cost of two sources of truth for one fact, and a JWT that goes stale the moment
an owner changes someone's role — a stale _authorization_ claim, which is the
worst kind. The predicate reads the live membership instead.

**Rejected as unneeded — 4:** a per-organization permission table. With three
fixed roles and a closed action set, the indirection buys nothing and adds a
query per request.

---

## 5. Request perimeter

**Canonical order on EVERY route:**

```
HTTP request
  -> withAuth()            401 if no session; opens withRequestContext
  -> parseRequest()        400 on Zod failure (flattened issue map)
  -> [Prisma read]         ORG-FILTERED: where { orgId: active.orgId }
  -> assertOwnership()     404 if missing OR not yours (no enumeration leak)
  -> assertCan()           403 if role/ability denied
  -> [work + auditLog()]
  -> ai.complete / ai.stream
  -> Response.json()
```

Verified against the SDK: `withAuth` maps `RequestValidationError` → 400 with the
flattened issue map, `OwnershipError` → 404, `AbilityError` → 403, and
auto-emits an audit event on both denials. `withAuth<P>` supplies
`{ session, params, requestId }`, and `RouteParams = Promise<{ id: string }>`
matches the real params contract.

### Two-step tenant scoping (explicit commitment)

**Step one, at the query:** every read is org-filtered —
`where: { orgId: active.orgId }` — so a cross-tenant id never returns a row and
arrives at step two as `null`.

**Step two, the ownership step:** confirms visibility and yields 404 for both
"missing" and "not yours". Both branches of `assertOwnership` throw a bare
`new OwnershipError()`, so the two response bodies are **byte-identical by
construction**, not by coincidence. The smoke suite asserts it anyway.

### The ownership adaptation, stated plainly (F6)

`assertOwnership` compares a literal `resource.userId`. `Ticket` has `ownerId`.
One helper — `assertTicketOwnership(row, membership, userId)` — maps the row onto
the ownership contract and delegates:

```
principal = membership.role === "agent" ? row.ownerId : userId
assertOwnership(row && { id: row.id, userId: principal }, userId)
```

Two things are true about this and both are stated rather than dressed up:

1. **For agents it is a real ownership check** — the agent's own id must match the
   ticket's `ownerId`, or 404.
2. **For owner and viewer it degenerates to a presence check.** Their read
   authorization is the org filter in step one; the row exists inside their
   organization, therefore they may read it. This is what resolves the
   contradiction in v1 of this plan, which claimed org-wide read for owner and
   viewer while routing them through an ownership check that would have 404'd
   them on any agent's ticket.

No route contains an inline `row.userId === session.user.id`. The only ownership
comparison in the codebase lives inside `assertOwnership`, reached through this
one helper.

### Active organization resolution (the multi-org piece)

A `deskline_org` cookie (httpOnly, sameSite lax) carries the active organization.
**The cookie is untrusted input; the `Membership` query is the authority.** Every
request:

1. Reads the cookie.
2. Queries `Membership` by `(userId, orgId)`. A returned row is the active
   organization, and its `role` feeds the ability predicates.
3. If the cookie is missing, malformed, or names an organization the user does
   **not** belong to, it falls back deterministically to their oldest membership
   (`orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]`) and logs a warning with
   metadata only.
4. If the user has no membership at all, `OwnershipError` → 404. A user with no
   organization must not be able to distinguish "you belong to nothing" from
   "that does not exist".

Forging the cookie towards another organization **grants nothing**: the
membership query returns null and the user keeps seeing their own organization.
Isolation does not depend on the cookie being trustworthy.

### Route table

| Method | Path                      | Zod schema         | Perimeter                                                                                  | Unhappy paths               |
| ------ | ------------------------- | ------------------ | ------------------------------------------------------------------------------------------ | --------------------------- |
| GET    | `/api/tickets`            | `ListTicketsQuery` | `withAuth` + active org + org filter + `assertCan("ticket.read")`                          | 401 / 400 / 403             |
| POST   | `/api/tickets`            | `CreateTicketBody` | `withAuth` + `parseRequest` + `assertCan("ticket.create")` → work + triage + `auditLog`    | 401 / 400 / 403             |
| GET    | `/api/tickets/[id]`       | `RouteParams`      | `withAuth` + org filter + ownership step + `assertCan("ticket.read")`                      | 401 / 404 / 403             |
| PATCH  | `/api/tickets/[id]`       | `UpdateTicketBody` | full perimeter + `assertCan("ticket.update")` (may re-classify)                            | 401 / 400 / 404 / 403       |
| POST   | `/api/tickets/[id]/close` | `RouteParams`      | full perimeter + `assertCan("ticket.close")`                                               | 401 / 404 / 403             |
| POST   | `/api/tickets/[id]/draft` | `DraftBody`        | full perimeter + `assertCan("ticket.draft")` → **SSE**                                     | 401 / 400 / 404 / 403 / 503 |
| GET    | `/api/orgs`               | —                  | `withAuth` — lists only the caller's memberships                                           | 401                         |
| POST   | `/api/orgs/switch`        | `SwitchOrgBody`    | `withAuth` + `parseRequest` + membership read + ownership step → set-cookie + `auditLog`   | 401 / 400 / 404             |
| GET    | `/api/admin/members`      | —                  | `withAuth` + `assertCan("org.members.read")` + org filter                                  | 401 / 403                   |
| PATCH  | `/api/admin/members/[id]` | `RoleChangeBody`   | full perimeter + `assertCan("org.members.manage")` + `auditLog`                            | 401 / 400 / 404 / 403       |
| GET    | `/api/admin/audit`        | —                  | `withAuth` + `assertCan("org.audit.read")` + org scope (**rewrite — currently leaks, F8**) | 401 / 403                   |
| GET    | `/api/admin/usage`        | —                  | `withAuth` + `assertCan("org.usage.read")` + org filter                                    | 401 / 403                   |

**On `/api/orgs` and `/api/orgs/switch`:** they introduce no new resource — they
operate on `Org` and `Membership`, both already in the frozen family. They are
the minimum surface multi-org needs, and both run the full perimeter, so they add
evidence rather than scope.

**Query-string validation:** `parseRequest` validates bodies, not search params.
`parseQuery(req, schema)` is added in `src/lib/validations/tickets.ts`, throwing
the same `RequestValidationError` and producing the same 400. No route reads
`searchParams` unvalidated.

**Hardening:** `src/proxy.ts` is **created** — the app serves no security headers
today (F11). `securityHeaders` is imported from
`@upstart13-com/aiden-security/middleware` and **called** as a factory;
re-exporting the factory itself registers the wrong signature and applies
nothing. No `$executeRawUnsafe`, `eval`, `new Function`, or
`dangerouslySetInnerHTML`. Secret-bearing modules open with `"server-only"`, and
no `"use client"` file imports one.

**AI wiring:** one `createAIClient` in `src/lib/ai.ts`, driven by
`aiden.config.ts`, which is restored to the starter's `{ enabled, model }` shape
(F2). Routes only ever call `getAI()`, so switching provider is one config line
and zero route edits — demonstrated live between Anthropic and OpenAI. Draft
reply is the single SSE feature: `createAIStreamResponse(stream, { signal })`
from `aiden-realtime` server-side, `useAIStream(url, …)` from
`aiden-realtime/react` client-side. Triage is the single structured-output use.
Per-route `maxTokens` on both. Ticket content is **fenced inside the user
message, never concatenated into the system prompt**. No raw `fetch` to any
provider, no WebSockets, no hand-rolled SSE encoder.

### Graded smoke suite (`scripts/smoke.sh`, curl)

| #   | Probe                                                     | Expected                                                                                          |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | Unauthenticated `GET /api/tickets`                        | **401**                                                                                           |
| 2   | Malformed create body                                     | **400**                                                                                           |
| 3   | Acme agent requests a Globex ticket                       | **404**                                                                                           |
| 4   | Agent A PATCHes agent B's same-org ticket                 | **404**                                                                                           |
| 5   | Nonexistent ticket id                                     | **404**, body compared byte-for-byte against the not-yours body                                   |
| 6   | Viewer POSTs to `/draft`                                  | **403**                                                                                           |
| 7   | Acme user forges the `deskline_org` cookie towards Globex | **200, Acme rows only**                                                                           |
| 8   | Dual-membership user switches org and lists again         | Disjoint ticket sets                                                                              |
| 9   | `POST /api/orgs/switch` to a non-member org               | **404**                                                                                           |
| 10  | Acme owner reads `/api/admin/audit`                       | Zero rows whose actor is a Globex member — proves the denial-event union (F9) does not over-fetch |

Probes 7–10 are specific to this build; the first six are the spec's.

---

## 6. Audit

Domain events via `auditLog({ event, resourceId, metadata })`, fired **after** the
work. Metadata is minimal — **never** bodies or prompts.

| Event                | `resourceId`           | `metadata`                    |
| -------------------- | ---------------------- | ----------------------------- |
| `ticket.create`      | ticket id              | `{ orgId, status }`           |
| `ticket.update`      | ticket id              | `{ orgId, changedFields }`    |
| `ticket.close`       | ticket id              | `{ orgId }`                   |
| `ai.draft`           | ticket id              | `{ orgId, model, tone }`      |
| `ai.classify`        | ticket id              | `{ orgId, model, priority }`  |
| `member.role_change` | membership id          | `{ orgId, fromRole, toRole }` |
| `org.switch`         | target organization id | `{ fromOrgId, toOrgId }`      |

Auto-emitted events (`signIn` / `signOut` / `createUser`, and the
`security.ownership_failed` / `security.ability_denied` denials) are **relied
upon, not re-implemented**.

### The org-scoped viewer must union two predicates (F9)

Denial events are emitted from inside the package with fixed metadata that
carries no `orgId`. A viewer filtering only on `metadata->>'orgId'` would show
every successful action and **hide every denied attempt** — precisely the rows a
security reviewer opens the page to see.

The viewer therefore selects rows where **either** `metadata->>'orgId'` equals
the caller's organization (domain events) **or** `actorId` is one of the
organization's member user ids (denial and auth events). Member ids come from an
org-filtered `Membership` query, so the second predicate is still tenant-bound —
probe 10 asserts it does not over-fetch.

`createAuditReader` cannot express either predicate (F8), so the viewer queries
`prisma.auditLog` directly. The missing metadata filter is raised upstream per
`CLAUDE.md` rather than treated as a local quirk.

**The shipped `/api/admin/audit` route is rewritten, not extended.** It currently
calls `auditReader.list()` with no org scope at all — a cross-tenant audit leak
to any global admin, present in the repository today.

### Logger and sinks

Exactly one `createLogger({ name })` in `src/lib/logger.ts`. `aiden-logging` is
installed once — two instances mean two `AsyncLocalStorage` stores and an empty
request context in production. Verified: only one copy is installed, and
`aiden-ai` imports `recordAIUsage` from that same copy.

Sinks are registered from modules inside the route module graph, not only from
`instrumentation.ts`. Next bundles `instrumentation.ts` into a separate server
chunk with its own copy of the package; a sink registered only there lands on an
instance the handlers never resolve, and rows silently fall through to the
default sink while `npm ls` looks clean. Row persistence is verified empirically
before this dimension is called done.

**`setAuditSink` swappability (D7):** `aiden.config.ts` `audit.sink` selects
between the Prisma sink (default) and a local NDJSON file sink — one line, zero
call-site edits, the same pattern as the provider switch. Demonstrated live: flip
the flag, create a ticket, confirm the event lands in the file **and is absent**
from `AuditLog` while the flag points at the file, then revert.

**Retention (D7 — consumer-owned, not an SDK concern):** the Prisma sink keeps
every row indefinitely. This build ships no retention policy because the seeded
database is local and disposable by design. In a real deployment retention lives
downstream of the sink — a scheduled truncation past the compliance window, or
log rotation for the file sink — never inside `aiden-security`.

### Cost telemetry

`setAIUsageSink` writes tokens, cost, model, provider, route, `orgId` and
`userId` into `AIUsage` for **both** AI calls, and it does fire on streaming
(F3).

Because `AIUsageRecord` carries neither `route` nor `orgId` (F5), the app owns a
`requestId → { route, orgId }` map, written immediately before each AI call and
**cleared in a `finally`** so a failed call cannot leak an entry. The sink reads
and deletes. Correlation is explicit app state; the plan does not pretend the SDK
provides it.

**Provider reality, stated rather than assumed:** with Anthropic the counts are
real. With the OpenAI adapter every streamed call reports zero, because
`toRequest` never sets `stream_options: { include_usage: true }`. DeskLine ships
on Anthropic, so the graded cost evidence is real; the OpenAI gap is documented
as an upstream finding in `.claude/fixes/aiden-ai.md`, naming the exact missing
line. When the live provider switch is demonstrated against OpenAI, the zero-cost
rows are shown and **explained**, not hidden — a known SDK limitation
demonstrated on purpose reads better than a silent zero.

**PII and secret hygiene:** usage metadata is logged — tokens, cost, model,
provider, route, ids — and **never** prompts or ticket bodies. Default redaction
(`password`, `token`, `apiKey`, `cookie`, `authorization`) is relied upon, and
there is no `console.log(req.json())` anywhere in the repo.

### Structured output: what is actually guaranteed (F10)

`ai.complete({ responseSchema })` does **not** send the schema to Anthropic; the
adapter parses the reply afterwards and leaves `parsed: undefined` if parsing
fails. Claiming provider-enforced structured output on this path would be false.

What DeskLine guarantees instead, at the app level:

- The triage system prompt states the exact JSON shape and forbids prose.
- `temperature: 0` and a small `maxTokens`.
- The result is **Zod-validated** before anything is persisted — a failed parse
  or a failed validation is a `null`, never a partial write.
- Degradation is explicit and identical in every failure mode: the ticket ships
  unclassified, and the failure is logged as metadata only.

On the OpenAI path the schema _is_ sent as `response_format`, whose strict mode
requires `additionalProperties: false` and every property listed in `required` —
the JSON Schema is authored to satisfy that, so the same triage code works on
both providers without branching. The behavioural difference between providers is
documented, not smoothed over.

---

## 7. Files touched

| File                                                                    | Note                                                                                                                                         |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `.npmrc`                                                                | new (gitignored) — `read:packages` PAT so the scoped `@upstart13-com/aiden-cli` resolves (F1)                                                |
| `aiden.config.ts`                                                       | **rewrite** — restored to the starter's `{ enabled, model }` shape, app identity set to DeskLine, Anthropic enabled, `audit.sink` flag added |
| `.env.local` / `.env.example`                                           | edit — `AUTH_URL`, `AUTH_TRUST_HOST` (NextAuth v5 needs them under `next start`, which is how smoke evidence is captured)                    |
| `src/app/(marketing)/layout.tsx`                                        | edit — fix the pre-existing `readonly []` / `SiteFooterLink[]` type error (F2)                                                               |
| `prisma/fragments/{org,membership,ticket,aiusage}.prisma`               | new — models per Dimension 3                                                                                                                 |
| `prisma/fragments/user.prisma`                                          | edit — `memberships` and `tickets` back-relations                                                                                            |
| `prisma/migrations/*_deskline_core/`                                    | new                                                                                                                                          |
| `prisma/migrations/*_deskline_audit_org_index/`                         | new — expression index on `AuditLog.metadata->>'orgId'`, plus actor index if absent                                                          |
| `prisma/seed.ts`                                                        | edit — two orgs, roles, dual-membership user, tickets, injection probe ticket                                                                |
| `src/config/rbac.ts`                                                    | edit — single source of truth for role/permission strings, shared with the seed                                                              |
| `src/config/nav.ts`                                                     | edit — remove the chat entry when that page is deleted                                                                                       |
| `src/lib/abilities.ts`                                                  | edit — `AbilityPredicate` rules over the active membership (F7)                                                                              |
| `src/lib/org.ts`                                                        | new — active organization resolution, `assertOrgVisible`                                                                                     |
| `src/lib/tickets.ts`                                                    | new — `orgTicketsWhere`, `assertTicketOwnership` (the F6 adaptation), shared by routes and pages                                             |
| `src/lib/validations/tickets.ts`                                        | new — named Zod schemas + `parseQuery`                                                                                                       |
| `src/lib/ai.ts`                                                         | **rewrite** — realign to the restored config shape; one `createAIClient`, `getAI()`                                                          |
| `src/lib/ai-prompts.ts`                                                 | new — prompts, content fencing, triage Zod contract + JSON Schema mirror                                                                     |
| `src/lib/ai-usage.ts`                                                   | new — `setAIUsageSink` → `AIUsage`, plus the `requestId → {route, orgId}` map                                                                |
| `src/lib/triage.ts`                                                     | new — structured output, Zod-validated, explicit degradation                                                                                 |
| `src/lib/audit.ts` / `src/lib/audit-sinks.ts`                           | edit / new — sink selection and file implementation                                                                                          |
| `src/lib/security.ts`                                                   | edit — `configureSecurity` once; imports the sink registration                                                                               |
| `src/app/api/tickets/**`                                                | new — four perimeter routes                                                                                                                  |
| `src/app/api/orgs/{route.ts,switch/route.ts}`                           | new                                                                                                                                          |
| `src/app/api/admin/audit/route.ts`                                      | **rewrite** — currently leaks cross-tenant audit rows (F8)                                                                                   |
| `src/app/api/admin/{members,members/[id],usage}/route.ts`               | new — owner-only routes                                                                                                                      |
| `src/app/dashboard/page.tsx`, `src/app/dashboard/tickets/[id]/page.tsx` | new — list and detail, after the UI pre-flight                                                                                               |
| `src/app/admin/{members,audit,cost}/page.tsx`                           | new — owner pages                                                                                                                            |
| `src/components/tickets/*`                                              | new — table, badges, create dialog, draft panel with `useAIStream`                                                                           |
| `src/components/org/org-switcher.tsx`                                   | new — header organization switcher                                                                                                           |
| `src/app/layout.tsx`                                                    | verify — `ThemeProvider` at root, `globals.css`, `Toaster` at root                                                                           |
| `src/proxy.ts`                                                          | **new** — `securityHeaders` from the `/middleware` subpath, called as a factory (F11)                                                        |
| `src/app/api/dev/impersonate/route.ts`                                  | **delete** — an impersonation backdoor does not survive a security review                                                                    |
| `src/app/api/ai/chat/route.ts`, `src/app/dashboard/chat/page.tsx`       | **delete** — a second AI surface, outside the frozen scope                                                                                   |
| `src/**/*.test.ts`                                                      | new — unit tests (abilities, scoping, validation, prompt fencing) + route-handler tests                                                      |
| `scripts/smoke.sh`                                                      | new — graded curl suite, ten probes                                                                                                          |
| `.claude/fixes/aiden-cli.md`                                            | new — F1: `CLAUDE.md` documents the unscoped `npx aiden`, which resolves to an unrelated third-party package                                 |
| `.claude/fixes/aiden-ai.md`                                             | new — F3 (`stream_options`), F10 (schema not sent to Anthropic)                                                                              |
| `.claude/fixes/aiden-security.md`                                       | new — F6, F8, F9 (`assertOwnership` field contract; no org filter in the reader; denial events lack `orgId`)                                 |
| `.claude/fixes/INDEX.md`                                                | edit — new categories and counts                                                                                                             |
| `docs/ops-diagnosis.md`                                                 | new — the 8 upgrade steps, five no-op causes, recovery runbook, duplicate-logging root cause                                                 |
| `docs/self-assessment.md`                                               | new — mapping against the Module 12 readiness bars                                                                                           |
| `docs/demo-walkthrough.md`                                              | new — demo script                                                                                                                            |
| `docs/evidence/`                                                        | new — doctor, smoke, audit rows, usage rows, SSE capture, injection probe, security review, upgrade dry-run                                  |
| `README.md`                                                             | edit — run steps, scoped CLI commands, how to switch AI provider                                                                             |

**On the deletions.** `/api/dev/impersonate` lets one user assume another's
identity — exactly the class of route a security review must flag. `/api/ai/chat`
is a second AI surface, and the spec caps scope at one SSE feature plus one
structured-output use. Only `src/app/dashboard/chat/page.tsx` references the chat
route and it is deleted in the same commit; nothing references the impersonation
route. `src/config/nav.ts` is checked at deletion time.

---

## 8. Rollback

- **Schema:** revert the fragment files and apply the migration down-steps. In
  dev, `prisma migrate reset` against the disposable local database. The two
  migrations revert in reverse order: the audit index first, then
  `deskline_core`.
- **Code:** the work lives on the certification branch; rollback is reverting the
  branch commits. No shared history is rewritten.
- **AI provider:** one line in `aiden.config.ts`; zero route edits.
- **Audit sink:** likewise, one flag.
- **Active organization:** the `deskline_org` cookie is disposable; clearing it
  returns the user to their default membership. No persistent state to unwind.
- **Deleted starter routes:** restored from git history if ever needed, though
  restoring the impersonation route would reintroduce the security finding that
  motivated its removal.
- **Audit rows persist and are accepted as non-reversible.** Audit history is
  evidence, not state to unwind. A rollback that erases the record of what
  happened defeats the purpose of keeping the record.

---

## Verify against plan

The build is verified against this document, not against memory:

- Plan files against `git diff --stat`.
- Plan routes against the implemented handlers, reading each to confirm the
  perimeter order is intact.
- Plan audit events against real `AuditLog` rows in Prisma Studio — **including
  at least one denial row**, to prove the F9 union works.
- Real `AIUsage` rows against the Audit dimension, for both AI calls.
- All ten smoke probes against a local production build.

Every deviation surfaced during the build is recorded in the deviation log at the
top of this document, with a date and root cause. None is silently absorbed.
