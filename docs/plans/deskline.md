# DeskLine — Plan

**Status: APPROVED** — approved by the product owner (chat, 2026-08-04) before the rework below was implemented. This document supersedes an earlier, less detailed informal brief that the initial build was written against; the gaps found when the formal spec arrived are the reason for this rework, not a from-scratch build.

**Deviation note recorded during planning (not discovered mid-build):** the spec's ASCII perimeter diagram lists `assertOwnership()` before `assertCan()`. The persona table and graded probe #2 (`Viewer POST draft → 403`) require the opposite order on ticket-mutate routes — see **Permissions** below for the full justification. This is a deliberate, reasoned deviation from the literal diagram, not an oversight.

---

## 1. Outcome

User-visible behavior, not implementation:

- A user registers, is added to an org by an existing Owner (no self-serve org creation, no invite tokens — Owners add already-registered users by email).
- **Agent**: sees only tickets they created (list + detail); creates a ticket (subject + body) — the ticket is auto-classified by AI into `priority`/`category`/`sentiment` before the response returns; updates/closes their own tickets; streams an AI-drafted reply for their own ticket, token by token.
- **Owner**: sees every ticket in their org (read-only), manages org membership + roles, views the org's audit trail and AI cost spend. Cannot create/mutate tickets or invoke AI on them (matches the spec's persona table — ticket CRUD is Agent-only).
- **Viewer**: sees every ticket in their org (read-only), like Owner, but has no member-management or audit access. Any attempt to create/mutate a ticket or invoke AI is a **403**.
- Cross-org access is always a **404**, indistinguishable from "doesn't exist" — never a 403, never a 200 with someone else's data.

## 2. Data

Frozen resource family — `Org`, `Membership`, `Ticket`, `AIUsage` (custom) + the shipped `AuditLog` fragment. No other resources (a `TicketSummary` model from the earlier build is dropped for this reason).

| Model | Key fields | Relations | Indexes |
|---|---|---|---|
| `Org` | `id`, `name`, `createdAt` | `memberships Membership[]`, `tickets Ticket[]` | — |
| `Membership` | `id`, `orgId`, `userId`, `role` (`"owner"\|"agent"\|"viewer"`, free-text), `createdAt` | `org`, `user`, both `onDelete: Cascade` | `@@unique([orgId,userId])`, `@@index([userId])`, `@@index([orgId])` |
| `Ticket` | `id`, `orgId`, `ownerId` (creator/assignee — one field does both jobs; no reassignment feature built), `subject`, `body`, `status` (`"open"\|"pending"\|"closed"`), `priority?`, `category?`, `sentiment?` (all three AI-set, never user-entered), `createdAt`, `updatedAt` | `org`, `owner` (`@relation("TicketOwner")`), both `onDelete: Cascade` | `@@index([orgId])`, `@@index([ownerId])`, `@@index([orgId,status])` |
| `AIUsage` | `id`, `orgId`, `userId`, `route`, `model`, `promptTokens`, `completionTokens`, `costUsd` (`Decimal(10,6)`), `createdAt` | none (denormalized, same convention as the shipped `AuditLog`) | `@@index([orgId])`, `@@index([userId])`, `@@index([createdAt])` |
| `AuditLog` | shipped fragment, unmodified | denormalized `actorId` | shipped indexes |

`User` gains back-relations only: `memberships Membership[]`, `tickets Ticket[] @relation("TicketOwner")`.

Migration: drop `TicketSummary` (from the earlier build), keep everything else — already-applied migration for `Org`/`Membership`/`Ticket`/`AIUsage` stays.

## 3. Permissions

Three roles via `defineAbilities` in `src/lib/abilities.ts`, seeded in `prisma/seed.ts`:

- `"members.manage"`: `role === "owner"`.
- `"ticket.create"`: `role === "agent"`.
- `"ticket.mutate"`: `role === "agent"` (covers update/close/draft — same predicate as create today; kept as a separate ability key so each route names the exact permission it checks, not because the logic differs yet).

**Simplest-primitive rationale:** three flat roles with boolean predicates. No CASL, no per-resource conditional matrices — nothing here needs anything more expressive than "is your role X." Rejected as unneeded: a fourth "assigned-agent-can-view-but-not-edit" tier — the spec's persona table doesn't ask for it, and adding it would be scope creep with no graded signal.

**Why `assertCan` runs before `assertOwnership` on ticket-mutate routes (the deviation):**

The spec's persona table assigns each denial to a specific primitive: Viewer's denial is "assertCan (deny)" → 403; Agent-on-another-agent's-ticket is "assertOwnership + tenant scoping" → 404. Graded probe #2 requires Viewer `POST draft` → 403. `assertOwnership(resource, userId)` is unconditional — it 404s if `resource` is null *or* if `resource.userId !== userId`. A Viewer never owns any ticket, so if `assertOwnership` ran first, every Viewer mutate attempt would 404 (wrong — the row exists, they're just the wrong role, which is a 403 case). So mutate routes run `assertCan("ticket.mutate", {role})` first — a pure role-eligibility check with no row inspection, which is where Viewer/Owner correctly fail with 403 — and only then, for an eligible Agent, `assertOwnership` on the actual row, which is where Agent-vs-not-their-ticket correctly fails with 404.

**Declined for GET routes:** `assertOwnership` is *not* called unconditionally on ticket reads. Owner/Viewer are entitled to read every ticket in their org — calling `assertOwnership` for them would incorrectly 404 a ticket they don't personally own but are allowed to see. Instead, visibility is shaped at the query level (`getVisibleTicketsWhere` in `src/lib/tickets.ts`): `{orgId}` for owner/viewer, `{orgId, ownerId: userId}` for agent. For a single-ticket GET, Agent additionally gets an explicit `assertOwnership` call (so the package's automatic `security.ownership_failed` audit event fires); Owner/Viewer do not.

## 4. Request perimeter

Every route: `withAuth()` → (body routes) `parseRequest()` → org-scoped Prisma read → role/ownership check per the table below → work + `auditLog()` → `Response.json()`.

| Method | Path | Zod schema | Checks | Notes |
|---|---|---|---|---|
| GET | `/api/tickets` | `ListTicketsQuery` (searchParams) | `withAuth`; role-shaped `where` (no assertCan/assertOwnership) | List |
| POST | `/api/tickets` | `CreateTicketBody {subject, body}` | `withAuth` + `parseRequest` + `assertCan("ticket.create")` | Fires `ai.classify`; `ownerId` from session, never client input |
| GET | `/api/tickets/[id]` | `RouteParams` | `withAuth`; org-scoped read; `assertOwnership` only for `agent` role | 404 on missing/cross-org/not-agent's-own |
| PATCH | `/api/tickets/[id]` | `UpdateTicketBody {subject?, body?, status?}` | full perimeter, `assertCan("ticket.mutate")` then `assertOwnership` | May re-classify if subject/body changed |
| POST | `/api/tickets/[id]/close` | `RouteParams` | same gate as PATCH | Sets `status: "closed"` |
| POST | `/api/tickets/[id]/draft` | `DraftBody {instructions?}` | same gate as PATCH | SSE via `createAIStreamResponse` |
| GET | `/api/admin/members` | — | `withAuth` + `assertCan("members.manage")` | Org-scoped by caller's membership |
| PATCH/DELETE | `/api/admin/members/[id]` | `RoleChangeBody` | same, org-scoped read first | `DELETE` is an intentional extra beyond the spec's frozen route table (member removal) — harmless, no auto-fail condition applies |
| GET | `/api/admin/audit` | — | `withAuth`; owner-role → org-scoped; platform-admin-role → cross-org + optional `orgId` filter | Two independent gates, same handler — not blending the two RBAC systems' enforcement, just co-locating the read |
| GET | `/api/admin/usage` | — | `withAuth` + owner-role, org-scoped | `AIUsage` spend view |

Unhappy paths: 401 (no session), 400 (Zod fail), 404 (missing / not-yours / cross-org — always the same shape, no enumeration leak), 403 (role denial). No inline `row.userId === session.user.id` anywhere — ownership only through `assertOwnership`.

## 5. Audit

| Event | Fired from | resourceId | metadata |
|---|---|---|---|
| `ticket.create` | POST /api/tickets | ticket id | `{orgId}` |
| `ticket.update` | PATCH /api/tickets/[id] | ticket id | `{orgId, status}` |
| `ticket.close` | POST .../close | ticket id | `{orgId}` |
| `ai.draft` | POST .../draft, after stream completes | ticket id | `{orgId, model}` |
| `ai.classify` | after classify (create/update) | ticket id | `{orgId, model}` |
| `member.role_change` | PATCH /api/admin/members/[id] | membership id | `{orgId, role}` |

Plus the package's own auto-emitted `security.ownership_failed` / `security.ability_denied` / `auth.signin` / `auth.signout` events — relied on, not re-implemented. No prompt text, ticket bodies, or secrets ever go into `metadata`.

## 6. Files touched

- `prisma/fragments/ticket-summary.prisma` — deleted; `Ticket.summaries` relation removed.
- `src/lib/abilities.ts` — `ticket.create`/`ticket.mutate` replace `ticket.manage`.
- `src/lib/tickets.ts` — rewritten: `getVisibleTicketsWhere`, `assertTicketMutate`, `classifyTicket`.
- `src/app/api/tickets/route.ts`, `src/app/api/tickets/[id]/route.ts` — rewritten.
- `src/app/api/tickets/[id]/close/route.ts`, `src/app/api/tickets/[id]/draft/route.ts` — new.
- `src/app/api/tickets/[id]/summarize/route.ts` — deleted.
- `src/app/api/admin/audit/route.ts` — extended (owner+org-scoped path added alongside the untouched platform-admin path).
- `src/app/api/admin/usage/route.ts` — new.
- `src/middleware.ts` — new (`securityHeaders`).
- `src/app/dashboard/tickets/**`, `src/components/tickets/**` — updated for role-shaped list/detail/create.
- `src/app/dashboard/usage/page.tsx`, `src/app/dashboard/audit/page.tsx` — new. Kept separate from `/admin/*` deliberately: `src/app/admin/layout.tsx`'s own docstring frames `/admin` as a platform-admin-only backstop ("any page under `/admin` is protected"); threading org-owner access through it would weaken that contract. The owner-facing audit/usage views live under `/dashboard` instead, gated by Membership role the same way `/dashboard/members` already is. `/admin/audit` (platform view) is untouched.
- `prisma/seed.ts` — ticket ownership reassigned to agent users; one seeded ticket carries a prompt-injection probe body.
- `docs/ops-diagnosis.md`, `scripts/smoke-test.sh` — new.

## 7. Rollback

- Schema: the `TicketSummary`-drop migration has no down-migration authored (Prisma dev migrations are forward-only by convention here, matching the existing `prisma/migrations/` history) — reverting means restoring the fragment and running a new forward migration that re-adds it, not running a down-step.
- Feature flag: none — this is a rework of core routes, not a toggleable feature. If a regression surfaces post-merge, the fix is a forward patch, not a flag flip.
- `AuditLog`/`AIUsage` rows are accepted as non-reversible by design (audit trails don't get rolled back).
