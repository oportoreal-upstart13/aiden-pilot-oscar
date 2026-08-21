import { NextResponse } from "next/server";
import { assertCan, auditLog } from "@/lib/security";
import { withAuthIdRoute } from "@/lib/routes";
import { abilities } from "@/lib/abilities";
import { prisma } from "@/lib/prisma";
import { resolveActiveOrg } from "@/lib/org";
import {
  assertTicketOwnership,
  orgTicketsWhere,
  ticketDetailSelect,
  ticketOwnershipSelect,
} from "@/lib/tickets";

/**
 * Close a ticket.
 *
 * Closing has its own route so it has its own audit event. Routing it
 * through `PATCH` would record a close as a `ticket.update` and lose that
 * distinction — which is why `UpdateTicketBody` refuses `"closed"`.
 */
export const POST = withAuthIdRoute(async (_req, { session, params }) => {
  const membership = await resolveActiveOrg(session.user.id);

  const ticket = await prisma.ticket.findFirst({
    where: { ...orgTicketsWhere(membership, session.user.id), id: params.id },
    select: ticketOwnershipSelect,
  });

  assertTicketOwnership(ticket, membership, session.user.id);
  assertCan(abilities, session, "ticket.close", membership);

  const closed = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "closed" },
    select: ticketDetailSelect,
  });

  auditLog({
    event: "ticket.close",
    resourceId: ticket.id,
    metadata: { orgId: membership.orgId },
  });

  return NextResponse.json({ ticket: closed });
});
