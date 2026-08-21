import "server-only";
import { assertOwnership } from "@upstart13-com/aiden-security";
import type { Prisma, Ticket } from "@/generated/prisma/client";
import type { OrgMembership } from "@/lib/org";
import type { TicketStatus } from "@/config/rbac";

/**
 * Tenant scoping and the ownership adaptation for tickets, shared by the
 * route handlers and the server components that render the same data.
 */

/**
 * Step one of two-step tenant scoping: every ticket read is filtered by
 * the caller's active organization, so a cross-tenant id never returns a
 * row and reaches the ownership step as `null`.
 *
 * It also narrows by `ownerId` when the active role is `agent`, so that
 * the list and the detail read agree. Without that, an agent would see a
 * colleague's ticket in the list and get a 404 opening it, because
 * `assertTicketOwnership` is a real ownership check for agents and only a
 * presence check for owners and viewers.
 *
 * `userId` is passed alongside the membership even though
 * `membership.userId` holds the same value: it keeps the signature
 * parallel to `assertTicketOwnership`, and the two are meant to be read
 * together.
 *
 * For a single ticket, compose it with the id rather than querying by id
 * alone — `findFirst({ where: { ...orgTicketsWhere(m, uid), id } })`. Note
 * that a Prisma filter set to `undefined` is *omitted*, not matched
 * against null, so an id that failed to resolve would silently return the
 * first matching ticket; validate the id before it reaches here.
 */
export function orgTicketsWhere(
  membership: OrgMembership,
  userId: string,
  filters: { status?: TicketStatus } = {}
): Prisma.TicketWhereInput {
  return {
    orgId: membership.orgId,
    ...(membership.role === "agent" ? { ownerId: userId } : {}),
    ...(filters.status === undefined ? {} : { status: filters.status }),
  };
}

/**
 * Step two: the ownership step, adapted to `Ticket`.
 *
 * `assertOwnership` compares a literal `resource.userId`; `Ticket` carries
 * the spec's `ownerId`. This helper maps the row onto that contract and
 * delegates, so the only ownership comparison in the codebase stays the
 * one inside `assertOwnership`.
 *
 * Three properties are deliberate:
 *
 * 1. The ternary sits **inside** the `null` guard. Reading `row.ownerId`
 *    outside it is a compile error under `strict`, and at runtime a
 *    `TypeError` on any missing row — which `withAuth` does not catch,
 *    turning the cross-tenant and missing-id cases into 500s. Those are
 *    exactly the two probes that must return 404.
 * 2. The assertion signature is declared on a `function`, so callers
 *    narrow `row` from `Ticket | null` to `Ticket`. `assertOwnership`'s
 *    own assertion cannot do that here: it is applied to a freshly
 *    constructed object literal rather than to a reference, so it narrows
 *    nothing the caller can use. Callers must pass `row` directly — an
 *    expression in that position silently loses the narrowing.
 * 3. For owner and viewer the step degenerates to a presence check. Their
 *    read authorization is the org filter in step one; an in-org row is
 *    theirs to read. Whether they may *act* on it is `assertCan`, never
 *    this helper.
 *
 * Both branches of `assertOwnership` throw a bare `OwnershipError`, so
 * "missing" and "not yours" produce byte-identical 404 bodies. The two
 * stay distinguishable server-side in `AuditLog`, via the auto-emitted
 * `reason: "resource_not_found"` versus `reason: "wrong_owner"`.
 */
export function assertTicketOwnership(
  row: Ticket | null,
  membership: OrgMembership,
  userId: string
): asserts row is Ticket {
  assertOwnership(
    row && {
      id: row.id,
      userId: membership.role === "agent" ? row.ownerId : userId,
    },
    userId
  );
}
