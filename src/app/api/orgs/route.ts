import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/routes";
import { prisma } from "@/lib/prisma";

/**
 * List the organizations the caller belongs to.
 *
 * Scoped by `userId`, so it can only ever return the caller's own
 * memberships — there is no id to guess and nothing to enumerate. The
 * only unhappy path is 401.
 *
 * It deliberately does not resolve the active organization: doing so
 * would 404 a caller who belongs to nothing, and this endpoint's contract
 * is that an empty list is a valid answer. The active organization is
 * resolved by the routes and pages that need it.
 */
export const GET = withAuthRoute(async (_req, { session }) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      role: true,
      org: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    organizations: memberships.map((membership) => ({
      membershipId: membership.id,
      orgId: membership.org.id,
      name: membership.org.name,
      role: membership.role,
    })),
  });
});
