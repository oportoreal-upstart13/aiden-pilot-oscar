import { NextResponse } from "next/server";
import { assertCan } from "@/lib/security";
import { withAuthRoute } from "@/lib/routes";
import { abilities } from "@/lib/abilities";
import { prisma } from "@/lib/prisma";
import { resolveActiveOrg } from "@/lib/org";

/**
 * List the members of the caller's active organization.
 *
 * A pure role gate — owners only — with no ownership predicate: an owner
 * administers other people's memberships by definition. Tenant isolation
 * is the `orgId` filter, which is the caller's server-resolved active
 * organization and never anything the request supplies.
 */
export const GET = withAuthRoute(async (_req, { session }) => {
  const membership = await resolveActiveOrg(session.user.id);
  assertCan(abilities, session, "org.members.read", membership);

  const members = await prisma.membership.findMany({
    where: { orgId: membership.orgId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    orgId: membership.orgId,
    members: members.map((row) => ({
      membershipId: row.id,
      userId: row.user.id,
      name: row.user.name,
      email: row.user.email,
      role: row.role,
      joinedAt: row.createdAt,
    })),
  });
});
