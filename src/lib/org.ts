import "server-only";
import { cookies } from "next/headers";
import { assertOwnership } from "@upstart13-com/aiden-security";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { ORG_ROLES } from "@/config/rbac";
import type { OrgRole } from "@/config/rbac";

/**
 * Active-organization resolution.
 *
 * The `deskline_org` cookie carries the caller's chosen organization, and
 * it is treated as untrusted input throughout: the `Membership` query is
 * the authority. Forging the cookie towards another organization returns
 * no row and grants nothing — the caller simply keeps seeing their own
 * organization. Tenant isolation does not depend on the cookie being
 * trustworthy.
 *
 * This is the one place the caller's organization is resolved. No query
 * elsewhere may infer it implicitly; it is resolved once per request and
 * passed explicitly downward.
 */

export const ORG_COOKIE_NAME = "deskline_org";

/**
 * Serialisation options for the cookie, exported so the switch route sets
 * it exactly as it is read. `secure` is off in development because the
 * dev server and the smoke suite both run over plain HTTP.
 */
export const ORG_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
} as const;

/** The caller's membership in their active organization. */
export interface OrgMembership {
  /** Membership row id — the `resourceId` on `member.role_change` events. */
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
}

interface MembershipRow {
  id: string;
  orgId: string;
  userId: string;
  role: string;
}

/**
 * Narrow the database's free-form `role` string onto `OrgRole`.
 *
 * `Membership.role` is a String column with no database-level constraint,
 * so an unknown value is reachable through a direct write. Widening it
 * into the ability predicates would be the dangerous outcome, so an
 * unrecognised role degrades to the least-privileged one and is logged as
 * an error rather than swallowed.
 */
function asOrgRole(value: string): OrgRole {
  if ((ORG_ROLES as readonly string[]).includes(value)) {
    return value as OrgRole;
  }
  log.error(
    { role: value },
    "membership carries an unknown org role; degrading to viewer"
  );
  return "viewer";
}

function toOrgMembership(row: MembershipRow): OrgMembership {
  return {
    id: row.id,
    orgId: row.orgId,
    userId: row.userId,
    role: asOrgRole(row.role),
  };
}

/**
 * Resolve the caller's active organization.
 *
 * Reads the cookie, then verifies it against `Membership`. A cookie that
 * is missing, malformed, or names an organization the caller does not
 * belong to falls back deterministically to their oldest membership. A
 * caller with no membership at all gets an `OwnershipError` — 404 — so
 * "you belong to nothing" is indistinguishable from "that does not
 * exist".
 */
export async function resolveActiveOrg(userId: string): Promise<OrgMembership> {
  const requestedOrgId = (await cookies()).get(ORG_COOKIE_NAME)?.value;

  if (requestedOrgId) {
    const requested = await prisma.membership.findUnique({
      where: { orgId_userId: { orgId: requestedOrgId, userId } },
      select: { id: true, orgId: true, userId: true, role: true },
    });
    if (requested) return toOrgMembership(requested);

    // Metadata only — never the cookie value's provenance or any user data.
    log.warn(
      { requestedOrgId },
      "deskline_org names an organization the caller does not belong to; falling back to the default membership"
    );
  }

  const fallback = await prisma.membership.findFirst({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, orgId: true, userId: true, role: true },
  });

  // Presence check, and the 404 for a caller with no organization at all.
  // `Membership` already carries a literal `userId`, so this needs no
  // adaptation — unlike `Ticket`, see src/lib/tickets.ts.
  assertOwnership(fallback, userId);

  return toOrgMembership(fallback);
}

/**
 * The ownership step for a membership row, used by the organization
 * switch: a caller may only switch to an organization they belong to, and
 * a non-member target must 404 rather than reveal that the organization
 * exists.
 *
 * Named rather than inlined so the codebase keeps a single ownership
 * comparison, the one inside `assertOwnership`.
 */
export function assertOrgVisible<T extends { id?: string; userId: string }>(
  membership: T | null | undefined,
  userId: string
): asserts membership is T {
  assertOwnership(membership, userId);
}
