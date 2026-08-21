# DeskLine — Implementation Plan (Seven Dimensions)

**Candidate:** Oscar Portorreal (oscarportorreal@gmail.com)
**Target level:** AIDEN Certified — Associate (App Engineer)
**Repository:** `oportoreal-upstart13/aiden-pilot-oscar`, branch `certification`
**Status:** v3 — revised twice against the installed packages and against the
repository's actual state. Pending approval.
**Written:** 2026-08-21

> **Approval marker:** _pending_ — to be recorded as a server-timestamped event
> (Confluence sign-off, PR approval, or status transition) by the assigned
> reviewers. For a graded attempt this must **predate the first DeskLine feature
> commit** on `certification`.
>
> **UI pre-flight commitment** (to be performed and dated **before the first UI
> commit**): read `docs/design-system/00-overview.md` and the DS files for the
> components touched — `01-foundations`, `05-data-display` (tables, badges),
> `07-feedback` (toasts, streaming states), `08-page-layouts` (PageHeader,
> detail layout). The `/frontend-design` skill mandated by `CLAUDE.md` **is not
> shipped in this installation** (F4); the DS files are the pre-flight source
> and the gap is recorded as a fix entry.
>
> **Deviation log** — every deviation surfaced during the build, with a date and
> root cause. None is silently absorbed.
>
> - **D1 · 2026-08-21 · `src/lib/validations/orgs.ts` added, outside the
>   Dimension 7 file list.** Root cause: the route table names `SwitchOrgBody`
>   and `RoleChangeBody`, but Dimension 7 listed only
>   `src/lib/validations/tickets.ts`. Both schemas are org-scoped, not
>   ticket-scoped; housing them in a file named `tickets.ts` would have made the
>   filename lie about its contents. One new file, no new surface — the schemas
>   were always going to exist.
> - **D2 · 2026-08-21 · `parseQuery` moved from
>   `src/lib/validations/tickets.ts` (where Dimension 5 placed it) to
>   `src/lib/security.ts`.** Root cause: `parseQuery` must throw
>   `RequestValidationError`, which pulls `aiden-security` and, transitively,
>   `aiden-logging` (pino) into whatever imports it. Leaving it beside the
>   schemas would have made every schema module server-only, so the phase 4
>   create-ticket form could not have reused `CreateTicketBody` with
>   `zodResolver` without a file split later. Moving it puts `parseQuery` next
>   to the `parseRequest` re-export it mirrors and keeps `src/lib/validations/*`
>   pure Zod.
> - **D3 · 2026-08-21 · the ticket list is narrowed by `ownerId` for agents;
>   Dimensions 2 and 4 amended to match.** Root cause: Dimension 2 promised any
>   member a dashboard listing the tickets of their active organization, while
>   the route table applied the ownership step to `GET /api/tickets/[id]` — and
>   that step is a real ownership check for agents. An agent would therefore
>   have seen a colleague's ticket in the list and received a 404 opening it.
>   The list and the detail must agree; `orgTicketsWhere` now takes the active
>   membership and applies the same boundary the detail read enforces.

---

## 0. Pre-build findings

Before this plan was finalised, the repository and the installed
`@upstart13-com/aiden-*` packages were read end to end, and several claims were
tested rather than assumed. These findings shaped the plan. A plan written
against assumed APIs is a plan that manufactures deviations later.

| #       | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Consequence for this plan                                                                                                                                                                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **F1**  | **`npx aiden` resolves to `aiden@0.0.3`, an unrelated third-party npm package** — not the Upstart13 CLI. `CLAUDE.md` line 26 documents the unscoped command, which is what pulls it. The real CLI is `@upstart13-com/aiden-cli` on GitHub Packages, confirmed by running it successfully against this repository (`docs/evidence/doctor-2026-08-21-*.txt`).                                                                                                                                                                                                                         | Every command in the README and in evidence capture uses the scoped name. Recorded as fix entry `aiden-cli.md`, with the supply-chain note that a stale `npx` cache entry for the foreign package exists on this machine.                                                                                                            |
| **F2**  | **`aiden init`'s starter tree compiles clean** (`tsc --noEmit`, exit 0). The `readonly []` / `SiteFooterLink[]` error seen earlier was **self-inflicted**: removing the shipped `as { href: string; label: string }[]` cast from `app.footerLinks` under `as const` narrows it to `readonly []`.                                                                                                                                                                                                                                                                                    | The cast is not restored; instead the consumer spreads — `links={[...aidenConfig.app.footerLinks]}` in `src/app/(marketing)/layout.tsx` — keeping the config literal free of casts. Verified: `tsc --noEmit` clean. This is a consequence of a decision in this plan, not a template defect, and is described as such.               |
| **F3**  | **`setAIUsageSink` fires on streaming.** `createAIStreamResponse` calls `stream.finalResponse()`, which reaches `reportUsage()` → the sink. With **Anthropic**, counts are real (`promptTokens` from `message_start`, `completionTokens` from `message_delta`). With **OpenAI**, `complete()` reports real counts but every **streamed** call reports zero, because `toRequest` never sets `stream_options: { include_usage: true }`.                                                                                                                                               | No estimated-usage fallback is built. DeskLine ships on Anthropic, where both calls report real numbers. The OpenAI streaming gap is documented as an upstream finding (`aiden-ai.md`) and, when the live provider switch is demonstrated, the zero-cost draft row is **shown and explained** rather than hidden.                    |
| **F4**  | **The `/frontend-design` skill does not exist** in this installation. `.claude/commands/` holds six commands; none is it. `CLAUDE.md` mandates it before any UI.                                                                                                                                                                                                                                                                                                                                                                                                                    | The DS-file contingency applies from day one. Recorded as a fix entry.                                                                                                                                                                                                                                                               |
| **F5**  | **`AIUsageRecord` carries no `route` and no `orgId`**; `getRequestContext()` returns only `{ requestId, userId }`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | The app owns a `requestId → { route, orgId }` map, written immediately before each AI call and cleared in a `finally`. Correlation is explicit app state; the plan does not pretend the SDK supplies it.                                                                                                                             |
| **F6**  | **`assertOwnership<T extends { id?: string; userId: string }>`** compares a literal `resource.userId`. `Ticket` uses `ownerId`, per the spec's frozen model.                                                                                                                                                                                                                                                                                                                                                                                                                        | One helper adapts the row to the ownership contract, with an assertion signature so the caller gets narrowing. See Dimension 5.                                                                                                                                                                                                      |
| **F7**  | **`defineAbilities`'s `{ roles: [...] }` shorthand reads `session.user.roles`** — NextAuth's global roles — not `Membership.role`.                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Every org-scoped rule is an `AbilityPredicate` receiving the active membership as the resource. The shorthand is kept only for the starter's genuinely global admin rules.                                                                                                                                                           |
| **F8**  | **`createAuditReader`'s filters are `{ userId?, event?, from?, to? }`** — no metadata hook, so no org filter. The shipped `src/app/api/admin/audit/route.ts` calls `auditReader.list()` **with no org scope at all**, leaking audit rows across tenants to any global admin.                                                                                                                                                                                                                                                                                                        | The org-scoped viewer queries `prisma.auditLog` directly. The shipped route is rewritten, not extended. The missing filter is raised upstream per `CLAUDE.md`.                                                                                                                                                                       |
| **F9**  | **Auto-emitted denial events** (`security.ownership_failed`, `security.ability_denied`) are emitted inside the package with fixed metadata (`reason`, `actorUserId`, `action`, `actorRoles`) — **no `orgId`**. The same is true of `signIn` / `signOut`. Consequence for a multi-org app: these rows are **not partitionable by organization at all**. For a member of two orgs, a denial raised while acting in org B is indistinguishable from one raised in org A.                                                                                                               | The viewer attributes them by actor and says so, in the UI and in this plan. The limitation is declared, not engineered around — no amount of querying recovers information the row does not contain. This sharpens the upstream report from "denial events lack orgId" to "denial events are un-attributable in multi-tenant apps". |
| **F10** | **`responseSchema` is never sent to Anthropic.** The adapter omits it and `JSON.parse`s the reply afterwards, silently leaving `parsed: undefined` on failure. OpenAI does send `response_format: { type: "json_schema", strict: true }`, whose strict mode requires `additionalProperties: false` and every property in `required`.                                                                                                                                                                                                                                                | Triage's guarantee is app-level and stated as such: shape instruction in the system prompt, `temperature: 0`, Zod validation before persistence, explicit degradation. The JSON Schema is authored to satisfy OpenAI strict mode so one triage implementation serves both providers.                                                 |
| **F11** | **`securityHeaders` lives only at `@upstart13-com/aiden-security/middleware`** and is a factory that must be called. Next 16 uses `proxy` as the middleware filename. Neither `src/proxy.ts` nor `middleware.ts` exists — **the app currently serves no security headers**.                                                                                                                                                                                                                                                                                                         | `src/proxy.ts` is a file to create, not edit.                                                                                                                                                                                                                                                                                        |
| **F12** | **`aiden doctor` cannot parse the `aiden.config.ts` that `aiden init` produces**, when that file is checked out with CRLF line endings on Windows: `failed to parse aiden.config.ts literal: Bad control character in string literal in JSON`. The same content with LF endings parses. The shipped literal contains `//` inside a string value (`url: "example.com"`), which is the probable interaction with doctor's comment-stripping step — **the exact mechanism was not isolated.** The config used by this build has no `//` inside any string value and parses under CRLF. | The config avoids `//` inside string values (`url: "deskline.example.com"`). A `.gitattributes` pins `eol=lf` repo-wide so checkouts stop reintroducing CRLF. Recorded in `aiden-cli.md` with both candidate causes and what was ruled out — CRLF alone is not sufficient, since this repo's current config is CRLF and parses.      |

**Retracted finding.** An earlier draft of this plan carried a thirteenth
finding claiming that `aiden doctor` only recognises boolean provider flags and
silently drops the API-key requirement for the starter's `{ enabled, model }`
object shape. It was **refuted by experiment**: with
`anthropic: { enabled: true, model: undefined as string | undefined }`, doctor
correctly listed `ANTHROPIC_API_KEY` among the required variables. The original
observation — a required-variable count falling from three to two — is better
explained by the provider having been disabled at that moment. The claim was
withdrawn before it reached the build. It is recorded here because catching it
was the plan-verification discipline working as intended, and because a plan
that hides its own retractions is not a plan anyone should trust.

**Provenance note.** Every finding above was observed in this repository against
its own installed packages, with the doctor runs captured under
`docs/evidence/`. No configuration, comment, or fix entry is carried in from
another candidate's build.

**Prior exploration.** An earlier, unplanned DeskLine build exists in this
repository on `main` (commit `1213755`, 2026-08-04, 135 files). It is retained,
not discarded: it is where several of the findings above were first encountered.
This certification attempt begins on the `certification` branch, whose history
starts with the starter scaffold, followed by this plan, followed by approval —
and no DeskLine feature code before that point. The earlier build is treated as
the author's own reference material and is not copied forward; every file in
this attempt is written against this plan and verified against it.

---

## 1. How this build differs

| Decision                                                                                         | Why                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Real multi-org** — a user may belong to several orgs, with the active org resolved per request | The spec only requires `@@unique([orgId, userId])`. Capping users at one org makes tenant isolation trivial rather than demonstrable, and it hides F9 entirely.                                                                                                                |
| **An audit viewer that shows denials, and admits what it cannot attribute**                      | A naive org-scoped viewer hides every denied attempt (F9) — exactly the rows a security reviewer opens the page for. Showing them, and labelling the ones that cannot be attributed, is more useful and more honest than either hiding them or pretending they are org-scoped. |
| **Route-handler-level tests**, not only pure-function tests                                      | Pure-function tests never exercise the perimeter. A broken pipeline order or a missing auth wrapper is invisible to them.                                                                                                                                                      |

---

## 2. Outcome

User-visible behaviour per persona. No implementation detail.

- **Any authenticated member** signs in with credential auth (`LoginForm` /
  `RegisterForm` from `aiden-auth`) and lands on a dashboard scoped to their
  active organization, with status and priority. **Owners and viewers see every
  ticket in the organization; agents see the tickets they own.** The list and
  the detail read apply the same boundary, so a row that appears in the list
  always opens (D3).
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
- **Owners** read every ticket in their organization but **do not mutate
  tickets** — owners govern the organization, agents work the queue. Owners
  additionally reach `/admin`: member role management, an org-scoped audit
  viewer, and an AI spend view broken down per user.
- **Cross-tenant access behaves as if the resource does not exist.** A user in
  Acme can never observe that a Globex ticket id exists.
- **When AI is unavailable**, the ticket is still created — unclassified — and
  the draft panel shows a readable error. AI is an enhancement, never a gate.

**Informational targets** (not graded gates): median latency to first SSE token
< 2s and cost per draft ≤ $0.05, over ≥5 calls against the seeded dataset, read
from `AIUsage` rows. These are meaningful only against a real vendor; a local
model would report zero cost and the target would be vacuous.

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
It is **not redefined**. Verified contents: `id`, `event`, `actorId?`,
`resourceId?`, `metadata Json?`, `requestId?`, `ipAddress?`, `userAgent?`,
`timestamp`, mapped to table `audit_logs`, with shipped indexes on `event`,
`actorId` and `timestamp`.

### Deliberate modelling decisions

- **`Ticket.ownerId` keeps the spec's name** even though `assertOwnership`
  expects a literal `userId` (F6). Fidelity to the frozen model beats
  convenience; the adaptation lives in one helper.
- **`AIUsage` keeps its spec name** despite the awkward `prisma.aIUsage`
  accessor. Renaming to `AiUsage` would read as a silent deviation from a model
  the spec spells out.
- **`provider String` is added to `AIUsage`.** Without it, comparing cost across
  providers after the live switch is impossible — and that switch is graded.
- **`costUsd` is a `Decimal`**, returned as `Prisma.Decimal` by the driver
  adapter. Every route serialising it converts explicitly (`Number(row.costUsd)`);
  a raw Decimal does not round-trip through `NextResponse.json()`.
- **No `@@unique([userId])` on `Membership`.** Capping a user at one org would
  make any unordered `findFirst({ where: { userId } })` safe, but removes the
  case worth demonstrating. Instead, **no query resolves the caller's
  organization implicitly** — it is resolved once per request and passed
  explicitly downward.

### Migrations

1. **`deskline_core`** — the four models, indexes and FKs, via
   `npm run db:migrate`.
2. **`deskline_audit_org_index`** — an expression index for the audit viewer's
   org predicate, added as raw SQL inside a migration. **The `AuditLog` model is
   not touched**; adding a database index is not redefining the fragment.

   The index must match the expression **Prisma actually emits**, captured from
   query logging against the dev database (Prisma 7.9.1):

```
   WHERE ("public"."audit_logs"."metadata"#>ARRAY[$1]::text[])::jsonb::jsonb = $2
   PARAMS: ["orgId","\"org_abc\"", ...]
```

The operator is `#>`, not `->>` and not `#>>`. Postgres elides the redundant
`::jsonb::jsonb` casts and folds `ARRAY['orgId']::text[]` to
`'{orgId}'::text[]`, so the index is:

```sql
   CREATE INDEX "audit_logs_metadata_org_id_idx"
     ON "audit_logs" ((metadata #> '{orgId}'::text[]));
```

Postgres matches functional indexes by expression equivalence, so an index
built on any other operator would be created and never used — and the planned
`EXPLAIN` check, run with `enable_seqscan off`, would have shown a sequential
scan reading as "the planner prefers seq scan at seed scale" while the real
cause was an inapplicable index. That failure mode is the reason this
expression was captured from a real query rather than assumed.

**Open decision, settled at implementation time.** Prisma sends the path
segment as a bound parameter (`$1`), so this index only matches when the
planner folds the constant — which `@prisma/adapter-pg` normally does via
unnamed prepared statements, but that is a property of driver behaviour, not
a guarantee. Two options: keep the Prisma client and accept that dependency,
or index `((metadata ->> 'orgId'))` and read the viewer's org-scoped side with
a parameterised `$queryRaw` tagged template, where the indexed expression
contains no parameter and matching is unconditional. `$queryRaw` is
permitted — `CLAUDE.md` prohibits `$executeRawUnsafe`. Whichever is chosen,
the `EXPLAIN` evidence must be taken against the statement the app actually
sends (via `auto_explain`), not against SQL with the values substituted by
hand — otherwise it proves the index matches a query the app never issues.

No index is added for `actorId` — the shipped fragment already provides
`audit_logs_actor_id_idx`.

### Seed (`prisma/seed.ts`)

Idempotent, against a throwaway local database.

- **Two organizations:** Acme Corp and Globex Inc.
- **Per organization:** one `owner`, two `agents`, one `viewer`.
- **One dual-membership user** — a consultant agent belonging to Acme **and**
  Globex with a different role in each. The living proof of multi-org, and the
  reason F9's limitation is observable rather than theoretical.
- **~6 tickets per organization**, across statuses and owners.
- **One ticket with a malicious body** attempting to override and echo the
  system prompt — subject of the adversarial injection probe.
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
ability resource and the predicate decides on its `role`.

| Route group                         | Primitive                                                  | Rationale                                                                                                          |
| ----------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Ticket read (list/get)              | org filter, plus an `ownerId` filter for agents; ownership step | Ownership is the natural boundary for an agent, applied identically in the list and the detail read so the two cannot disagree (D3); org-wide read for owner and viewer is a role fact, not a predicate |
| Ticket mutate (create/update/close) | ownership step + `assertCan`                               | Both needed: the row must be theirs (404) **and** the role must permit mutation (403)                              |
| AI actions (draft/classify)         | `assertCan` after ownership                                | AI is a privileged action on an owned row                                                                          |
| `/admin/*`                          | `assertCan` (owner only)                                   | A pure role gate; no ownership predicate applies                                                                   |
| Organization switch                 | ownership step on the membership                           | A membership question, not a role question: any role may switch to an org they belong to                           |

**Ticket mutation abilities are agent-only.** `ticket.create`, `ticket.update`,
`ticket.close`, `ticket.draft` and `ticket.classify` all require the active
membership's role to be `agent`. This matters because of how the ownership step
degenerates for owners (Dimension 5): an owner passes the presence check on any
in-org ticket, so **`assertCan` alone decides whether they may mutate it — and
it denies them, with 403.** A 403 leaks nothing there, since owners may already
read the row.

**Rejected as unneeded — 1:** CASL-style conditional abilities
(`can('update', 'Ticket', { ownerId: user.id })`). Row ownership is already
enforced in the canonical perimeter step; duplicating it as an ability condition
creates a second authority over the same fact, and two authorities over a
security fact drift apart eventually.

**Rejected as unneeded — 2:** a fourth `admin` role distinct from `owner`. The
spec freezes three personas and nothing in scope distinguishes them.

**Rejected as unneeded — 3:** mirroring the org role into the NextAuth JWT so
the `{ roles: [...] }` shorthand could be used. Terser rules, at the cost of two
sources of truth for one fact and a JWT that goes stale the moment an owner
changes someone's role — a stale _authorization_ claim, the worst kind. The
predicate reads the live membership instead.

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
  -> ownership step        404 if missing OR not yours (no enumeration leak)
  -> assertCan()           403 if role/ability denied
  -> [work + auditLog()]
  -> ai.complete / ai.stream
  -> Response.json()
```

Verified against the SDK: `withAuth` maps `RequestValidationError` → 400 with
the flattened issue map, `OwnershipError` → 404, `AbilityError` → 403, and
auto-emits an audit event on both denials. Anything else thrown inside a handler
is re-thrown and surfaces as a 500 — which is why the ownership helper below
must never dereference a null row.

### Two-step tenant scoping (explicit commitment)

**Step one, at the query:** every read is org-filtered —
`where: { orgId: active.orgId }` — so a cross-tenant id never returns a row and
arrives at step two as `null`.

**Step two, the ownership step:** yields 404 for both "missing" and "not
yours". Verified in the SDK: `OwnershipError` is constructed with a default
message and both branches of `assertOwnership` throw it with no argument, so
both responses are `{"error":"Resource not found"}` with the same status and
content type — **byte-identical by construction**, not by coincidence. The smoke
suite asserts it anyway.

The two cases remain distinguishable **server-side**, in `AuditLog`: the
auto-emitted denial carries `reason: "resource_not_found"` versus
`reason: "wrong_owner"` (the latter with `resourceId`). Nothing reaches the
client, and a reviewer can still tell the two apart — which is the correct place
for that distinction to live.

### The ownership adaptation (F6), stated plainly

`assertOwnership` compares a literal `resource.userId`; `Ticket` has `ownerId`.
One helper in `src/lib/tickets.ts` adapts the row and delegates:

```ts
export function assertTicketOwnership(
  row: Ticket | null,
  membership: OrgMembership,
  userId: string,
): asserts row is Ticket {
  assertOwnership(
    row && {
      id: row.id,
      userId: membership.role === "agent" ? row.ownerId : userId,
    },
    userId,
  );
}
```

Three properties of this shape are deliberate:

1. **The ternary sits inside the `null` guard.** Dereferencing `row.ownerId`
   outside it would be a compile error under `strict`, and at runtime a
   `TypeError` on any missing row — which `withAuth` does not catch, turning the
   cross-tenant and missing-id cases into 500s. Those are precisely the two
   probes that must return 404.
2. **The assertion signature is declared on a `function`**, so callers narrow
   `row` from `Ticket | null` to `Ticket`. `assertOwnership`'s own assertion does
   not propagate: it is applied to a freshly constructed object literal, not to a
   reference, so it narrows nothing the caller can use.
3. **For owner and viewer the step degenerates to a presence check.** Their read
   authorization is the org filter in step one; an in-org row is theirs to read.
   Whether they may _act_ on it is `assertCan`, never this helper. This is stated
   rather than dressed up, and it is what resolves the contradiction earlier
   drafts of this plan carried.

No route contains an inline `row.userId === session.user.id`. The only ownership
comparison in the codebase lives inside `assertOwnership`, reached through this
one helper.

### Dynamic route params

The SDK types the handler context as optional (`ctx?: { params: P }`) while Next
passes it as required; the starter's own dynamic route resolves this with a cast
at the export. With six dynamic routes planned, the cast lives **once**, in a
typed helper in `src/lib/routes.ts`, alongside
`type RouteParams = Promise<{ id: string }>`. Its exact shape is settled against
the SDK's types at implementation time and recorded here if it deviates.

### Active organization resolution (the multi-org piece)

A `deskline_org` cookie (httpOnly, sameSite lax) carries the active
organization. **The cookie is untrusted input; the `Membership` query is the
authority.** Every request:

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
operate on `Org` and `Membership`, already in the frozen family. They are the
minimum surface multi-org needs, and both run the full perimeter, so they add
evidence rather than scope.

**Query-string validation:** `parseRequest` validates bodies, not search params.
`parseQuery(req, schema)` is added in `src/lib/security.ts`, beside the
`parseRequest` re-export it mirrors, throwing the same `RequestValidationError`
and producing the same 400. It lives there rather than beside the schemas so
`src/lib/validations/*` stays pure Zod and remains importable from a client
form (D2). No route reads `searchParams` unvalidated.

**Hardening:** `src/proxy.ts` is **created** — the app serves no security
headers today (F11). `securityHeaders` is imported from
`@upstart13-com/aiden-security/middleware` and **called** as a factory. No
`$executeRawUnsafe`, `eval`, `new Function`, or `dangerouslySetInnerHTML`.
Secret-bearing modules open with `"server-only"`, and no `"use client"` file
imports one.

**AI wiring.** `aiden.config.ts` carries `ai.providers` as **boolean flags**
(`anthropic: true`), with model pinning in a sibling `ai.models` map and the
live provider in `ai.defaultProvider`. This shape is verified end to end in this
repository: doctor reports the config valid and all three required variables
present, and `tsc --noEmit` is clean. The starter's `{ enabled, model }` object
shape also satisfies doctor; a sibling `defaultProvider` key is required either
way, because the starter ships no notion of a live provider and Capability E
forbids naming one in route code. `src/lib/ai.ts` reads `models` and
`defaultProvider` and exposes `getAI()`; routes only ever call `getAI()`, so
switching provider is one config line with zero route edits — demonstrated live
between Anthropic and OpenAI.

Draft reply is the single SSE feature: `createAIStreamResponse(stream, { signal })`
from `aiden-realtime` server-side, `useAIStream(url, …)` from
`aiden-realtime/react` client-side. Triage is the single structured-output use.
Per-route `maxTokens` on both. Ticket content is **fenced inside the user
message, never concatenated into the system prompt**. No raw `fetch` to any
provider, no WebSockets, no hand-rolled SSE encoder.

### Graded smoke suite (`scripts/smoke.sh`, curl)

| #   | Probe                                                     | Expected                                                                                                                                                                                                  |
| --- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Unauthenticated `GET /api/tickets`                        | **401**                                                                                                                                                                                                   |
| 2   | Malformed create body                                     | **400**                                                                                                                                                                                                   |
| 3   | Acme agent requests a Globex ticket                       | **404**                                                                                                                                                                                                   |
| 4   | Agent A PATCHes agent B's same-org ticket                 | **404**                                                                                                                                                                                                   |
| 5   | Nonexistent ticket id                                     | **404**, body compared byte-for-byte against the not-yours body                                                                                                                                           |
| 6   | Viewer POSTs to `/draft`                                  | **403**                                                                                                                                                                                                   |
| 7   | Acme user forges the `deskline_org` cookie towards Globex | **200, Acme rows only**                                                                                                                                                                                   |
| 8   | Dual-membership user switches org and lists again         | Disjoint ticket sets                                                                                                                                                                                      |
| 9   | `POST /api/orgs/switch` to a non-member org               | **404**                                                                                                                                                                                                   |
| 10  | Acme owner reads `/api/admin/audit`                       | No domain event whose `metadata.orgId` is Globex, and no row whose actor belongs **exclusively** to Globex. Rows from the dual-membership consultant are expected and are labelled actor-scoped — see F9. |

Probes 7–10 are specific to this build; the first six are the spec's. Probe 10
is worded around F9 deliberately: a probe asserting "no Globex member's rows"
would fail against this build's own seed, because the consultant is a member of
both organizations and denial rows carry no organization.

---

## 6. Audit

Domain events via `auditLog({ event, resourceId, metadata })`, fired **after**
the work. Metadata is minimal — **never** bodies or prompts.

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

### The viewer is two queries, not one `OR`

The viewer needs domain events scoped by `metadata.orgId` **and** denial and
auth events, which carry no organization (F9) and can only be reached by actor.
Expressing that as a single `OR` forces the planner into a BitmapOr across a
jsonb expression index and a btree, which it commonly discards in favour of a
sequential scan — so the query that was meant to demonstrate index use would
demonstrate the opposite.

Instead: **two Prisma queries, merged in application code.**

- **A —** `metadata: { path: ["orgId"], equals: activeOrgId }`, served by the
  expression index from Dimension 3.
- **B —** `actorId: { in: <user ids of the org's members> }`, served by the
  shipped `audit_logs_actor_id_idx`. The member ids come from an org-filtered
  `Membership` query, so this side is still tenant-bound.

Results are de-duplicated by `id`, sorted by `timestamp` descending, and
truncated to the page size. No raw SQL: `createAuditReader` cannot express
either predicate (F8), so the viewer uses the Prisma client directly.

**Two limitations the viewer states in its own UI, rather than hiding:**

1. **Denial and auth events are attributed by actor, not by organization.** For a
   member of a single organization this is exact. For a member of several — the
   seeded consultant — it is not: a denial raised while acting in another
   organization appears here, indistinguishable. The information needed to
   separate them does not exist in the row.
2. **`actorId` is nullable.** An event emitted outside a request context has no
   actor, and if its metadata also lacks `orgId` it appears in no viewer at all.

Both are raised upstream as one report: denial events should carry the tenant
context the perimeter already had when it denied the request.

**The shipped `/api/admin/audit` route is rewritten, not extended.** It calls
`auditReader.list()` with no org scope at all — a cross-tenant audit leak to any
global admin, present in the repository today.

### Logger and sinks

Exactly one `createLogger({ name })` in `src/lib/logger.ts`. `aiden-logging` is
installed once — two instances mean two `AsyncLocalStorage` stores and an empty
request context in production. Verified: one copy installed, and `aiden-ai`
imports `recordAIUsage` from that same copy.

Sinks are registered from modules inside the route module graph, not only from
`instrumentation.ts`. Next bundles `instrumentation.ts` into a separate server
chunk with its own copy of the package; a sink registered only there lands on an
instance the handlers never resolve, and rows silently fall through to the
default sink while `npm ls` looks clean. Row persistence is verified empirically
before this dimension is called done.

**`setAuditSink` swappability (D7):** `aiden.config.ts` `audit.sink` selects
between the Prisma sink (default) and a local NDJSON file sink — one line, zero
call-site edits, the same pattern as the provider switch. Demonstrated live:
flip the flag, create a ticket, confirm the event lands in the file **and is
absent** from `AuditLog` while the flag points at the file, then revert.

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
and deletes. Correlation is explicit app state; this plan does not pretend the
SDK provides it.

**Provider reality, stated rather than assumed:** with Anthropic both calls
report real counts. With OpenAI, `complete()` reports real counts but streamed
calls report zero, because `toRequest` never sets
`stream_options: { include_usage: true }`. DeskLine ships on Anthropic, so the
graded cost evidence is real. When the live provider switch is demonstrated
against OpenAI, the zero-cost draft row is **shown and explained** — a known SDK
limitation demonstrated on purpose reads better than a silent zero.

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
  or failed validation yields `null`, never a partial write.
- Degradation is explicit and identical in every failure mode: the ticket ships
  unclassified and the failure is logged as metadata only.

On the OpenAI path the schema _is_ sent as `response_format`, whose strict mode
requires `additionalProperties: false` and every property listed in `required` —
the JSON Schema is authored to satisfy that, so one triage implementation serves
both providers without branching. The behavioural difference is documented, not
smoothed over.

---

## 7. Files touched

Environment work already applied to the working tree lands in a single setup
commit **after** plan approval; feature work follows in phases.

| File                                                                    | Note                                                                                                                                                                 |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.gitattributes`                                                        | new — `* text=auto eol=lf`, so checkouts stop reintroducing CRLF (F12)                                                                                               |
| `aiden.config.ts`                                                       | edit — DeskLine identity, boolean `ai.providers` with `anthropic: true`, sibling `ai.models` and `ai.defaultProvider`, `audit.sink`; no `//` inside any string value |
| `src/lib/ai.ts`                                                         | edit — reads `ai.models` / `ai.defaultProvider`, adds `getAI()`                                                                                                      |
| `src/app/(marketing)/layout.tsx`                                        | edit — `links={[...aidenConfig.app.footerLinks]}` (F2)                                                                                                               |
| `package.json`                                                          | edit — name `deskline`; `overrides: { "deepmerge-ts": "^8.0.1" }` for GHSA-ggr8-5vv4-36mx, a transitive CVE via `prisma → @prisma/config`                            |
| `package-lock.json`                                                     | new — regenerated with the override applied                                                                                                                          |
| `.env.local` / `.env.example`                                           | edit — `AUTH_URL`, `AUTH_TRUST_HOST` (NextAuth v5 needs them under `next start`, which is how smoke evidence is captured)                                            |
| `prisma/fragments/{org,membership,ticket,aiusage}.prisma`               | new — models per Dimension 3                                                                                                                                         |
| `prisma/fragments/user.prisma`                                          | edit — `memberships` and `tickets` back-relations                                                                                                                    |
| `prisma/migrations/*_deskline_core/`                                    | new                                                                                                                                                                  |
| `prisma/migrations/*_deskline_audit_org_index/`                         | new — expression index on `((metadata #>> ARRAY['orgId']::text[]))`                                                                                                  |
| `prisma/seed.ts`                                                        | edit — two orgs, roles, dual-membership consultant, tickets, injection probe ticket                                                                                  |
| `src/config/rbac.ts`                                                    | edit — single source of truth for role/permission strings, shared with the seed                                                                                      |
| `src/config/nav.ts`                                                     | edit — remove the chat entry when that page is deleted                                                                                                               |
| `src/lib/abilities.ts`                                                  | edit — `AbilityPredicate` rules over the active membership (F7)                                                                                                      |
| `src/lib/org.ts`                                                        | new — active organization resolution, `assertOrgVisible`                                                                                                             |
| `src/lib/tickets.ts`                                                    | new — `orgTicketsWhere`, `assertTicketOwnership` (F6), shared by routes and pages                                                                                    |
| `src/lib/routes.ts`                                                     | new — `RouteParams` and the single typed adapter for Next's required handler context                                                                                 |
| `src/lib/validations/tickets.ts`                                        | new — ticket Zod schemas, pure Zod so a client form can reuse them (D2)                                                                                              |
| `src/lib/validations/orgs.ts`                                           | new — `SwitchOrgBody`, `RoleChangeBody` (D1)                                                                                                                         |
| `src/lib/ai-prompts.ts`                                                 | new — prompts, content fencing, triage Zod contract + JSON Schema mirror                                                                                             |
| `src/lib/ai-usage.ts`                                                   | new — `setAIUsageSink` → `AIUsage`, plus the `requestId → {route, orgId}` map                                                                                        |
| `src/lib/triage.ts`                                                     | new — structured output, Zod-validated, explicit degradation                                                                                                         |
| `src/lib/audit.ts` / `src/lib/audit-sinks.ts`                           | edit / new — sink selection and file implementation                                                                                                                  |
| `src/lib/security.ts`                                                   | edit — `configureSecurity` once; `parseQuery` (D2); imports the sink registration                                                                                    |
| `src/app/api/tickets/**`                                                | new — four perimeter routes                                                                                                                                          |
| `src/app/api/orgs/{route.ts,switch/route.ts}`                           | new                                                                                                                                                                  |
| `src/app/api/admin/audit/route.ts`                                      | **rewrite** — currently leaks cross-tenant audit rows (F8)                                                                                                           |
| `src/app/api/admin/{members,members/[id],usage}/route.ts`               | new — owner-only routes                                                                                                                                              |
| `src/app/dashboard/page.tsx`, `src/app/dashboard/tickets/[id]/page.tsx` | new — list and detail, after the UI pre-flight                                                                                                                       |
| `src/app/admin/{members,audit,cost}/page.tsx`                           | new — owner pages                                                                                                                                                    |
| `src/components/tickets/*`                                              | new — table, badges, create dialog, draft panel with `useAIStream`                                                                                                   |
| `src/components/org/org-switcher.tsx`                                   | new — header organization switcher                                                                                                                                   |
| `src/app/layout.tsx`                                                    | verify — `ThemeProvider` at root, `globals.css`, `Toaster` at root                                                                                                   |
| `src/proxy.ts`                                                          | **new** — `securityHeaders` from the `/middleware` subpath, called as a factory (F11)                                                                                |
| `src/app/api/dev/impersonate/route.ts`                                  | **delete** — an impersonation backdoor does not survive a security review                                                                                            |
| `src/app/api/ai/chat/route.ts`, `src/app/dashboard/chat/page.tsx`       | **delete** — a second AI surface, outside the frozen scope                                                                                                           |
| `src/**/*.test.ts`                                                      | new — unit tests (abilities, scoping, validation, prompt fencing) + route-handler tests                                                                              |
| `scripts/smoke.sh`                                                      | new — graded curl suite, ten probes                                                                                                                                  |
| `.claude/fixes/aiden-cli.md`                                            | new — F1 (unscoped `npx aiden`), F12 (config literal unparseable under CRLF)                                                                                         |
| `.claude/fixes/aiden-ai.md`                                             | new — F3 (`stream_options`), F10 (schema not sent to Anthropic)                                                                                                      |
| `.claude/fixes/aiden-security.md`                                       | new — F6, F8, F9                                                                                                                                                     |
| `.claude/fixes/INDEX.md`                                                | edit — new categories and counts                                                                                                                                     |
| `docs/ops-diagnosis.md`                                                 | new — the 8 upgrade steps, five no-op causes, recovery runbook, duplicate-logging root cause                                                                         |
| `docs/self-assessment.md`                                               | new — mapping against the Module 12 readiness bars                                                                                                                   |
| `docs/demo-walkthrough.md`                                              | new — demo script                                                                                                                                                    |
| `docs/evidence/`                                                        | doctor red baseline and green run (already captured), plus smoke, audit rows, usage rows, SSE capture, injection probe, security review, upgrade dry-run             |
| `README.md`                                                             | edit — run steps, scoped CLI commands, how to switch AI provider                                                                                                     |

**On the deletions.** `/api/dev/impersonate` lets one user assume another's
identity — exactly the class of route a security review must flag. `/api/ai/chat`
is a second AI surface, and the spec caps scope at one SSE feature plus one
structured-output use. Only `src/app/dashboard/chat/page.tsx` references the
chat route and it is deleted in the same commit; nothing references the
impersonation route. `src/config/nav.ts` is checked at deletion time.

---

## 8. Rollback

- **Schema:** revert the fragment files and apply the migration down-steps. In
  dev, `prisma migrate reset` against the disposable local database. The two
  migrations revert in reverse order: the audit index first, then
  `deskline_core`.
- **Code:** the work lives on the `certification` branch; rollback is reverting
  those commits. No shared history is rewritten, and `main` is untouched.
- **AI provider:** one line in `aiden.config.ts`; zero route edits.
- **Audit sink:** likewise, one flag.
- **CVE override:** removing the `overrides` entry and reinstalling returns to
  the transitive version — at the cost of the vulnerability returning, which
  `aiden doctor` will report.
- **Active organization:** the `deskline_org` cookie is disposable; clearing it
  returns the user to their default membership. No persistent state to unwind.
- **Deleted starter routes:** restorable from git history, though restoring the
  impersonation route would reintroduce the finding that motivated its removal.
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
  at least one denial row**, to prove the two-query viewer surfaces them.
- The `deskline_audit_org_index` migration against a real `EXPLAIN`, reporting
  whether `enable_seqscan off` was needed and why.
- Real `AIUsage` rows for both AI calls.
- All ten smoke probes against a local production build.

Every deviation surfaced during the build is recorded in the deviation log at
the top of this document, with a date and root cause. None is silently absorbed.
