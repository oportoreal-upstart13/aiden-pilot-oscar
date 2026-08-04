import { NextResponse } from "next/server";
import { withAuth, auditLog } from "@/lib/security";
import { getCurrentMembership } from "@/lib/org";
import { assertTicketMutate } from "@/lib/tickets";
import { prisma } from "@/lib/prisma";

type RouteParams = Promise<{ id: string }>;

export const POST = withAuth<RouteParams>(async (_req, { session, params }) => {
  const { id } = await params;

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return NextResponse.json(
      { error: "You haven't been added to an organization yet." },
      { status: 403 }
    );
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id, orgId: membership.orgId },
  });
  assertTicketMutate(session, membership, ticket);

  const updated = await prisma.ticket.update({
    where: { id: ticket!.id },
    data: { status: "closed" },
  });

  auditLog({
    event: "ticket.close",
    resourceId: updated.id,
    metadata: { orgId: membership.orgId },
  });

  return NextResponse.json({ ticket: updated });
});
