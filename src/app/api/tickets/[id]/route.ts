import { NextResponse } from "next/server";
import { assertCan, auditLog, parseRequest } from "@/lib/security";
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
import { UpdateTicketBody } from "@/lib/validations/tickets";
import { triageTicket } from "@/lib/triage";

const ROUTE = "/api/tickets/[id]";

/**
 * Read one ticket.
 *
 * The perimeter runs in the canonical order: the query is org-filtered so
 * a cross-tenant id arrives as `null`, the ownership step turns both
 * "missing" and "not yours" into the same 404, and only then does the
 * ability gate run. `params.id` was Zod-validated by the adapter before
 * reaching this line.
 */
export const GET = withAuthIdRoute(async (_req, { session, params }) => {
  const membership = await resolveActiveOrg(session.user.id);

  const ticket = await prisma.ticket.findFirst({
    where: { ...orgTicketsWhere(membership, session.user.id), id: params.id },
    select: ticketDetailSelect,
  });

  assertTicketOwnership(ticket, membership, session.user.id);
  assertCan(abilities, session, "ticket.read", membership);

  return NextResponse.json({ ticket });
});

/**
 * Update a ticket, re-classifying when its content changed.
 *
 * `status` cannot be set to `"closed"` here — that is
 * `POST /api/tickets/[id]/close`, which emits `ticket.close`. Accepting
 * it would record a close as a `ticket.update`.
 */
export const PATCH = withAuthIdRoute(async (req, { session, params }) => {
  const body = await parseRequest(req, UpdateTicketBody);
  const membership = await resolveActiveOrg(session.user.id);

  const ticket = await prisma.ticket.findFirst({
    where: { ...orgTicketsWhere(membership, session.user.id), id: params.id },
    select: ticketOwnershipSelect,
  });

  assertTicketOwnership(ticket, membership, session.user.id);
  assertCan(abilities, session, "ticket.update", membership);

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: body,
    select: ticketDetailSelect,
  });

  auditLog({
    event: "ticket.update",
    resourceId: ticket.id,
    metadata: { orgId: membership.orgId, changedFields: Object.keys(body) },
  });

  const contentChanged = body.subject !== undefined || body.body !== undefined;
  if (!contentChanged) {
    return NextResponse.json({ ticket: updated });
  }

  const triaged = await triageTicket({
    subject: updated.subject,
    body: updated.body,
    route: `PATCH ${ROUTE}`,
    orgId: membership.orgId,
    userId: session.user.id,
  });

  if (!triaged) {
    return NextResponse.json({ ticket: updated });
  }

  const classified = await prisma.ticket.update({
    where: { id: ticket.id },
    data: triaged.result,
    select: ticketDetailSelect,
  });

  auditLog({
    event: "ai.classify",
    resourceId: ticket.id,
    metadata: {
      orgId: membership.orgId,
      model: triaged.model,
      priority: triaged.result.priority,
    },
  });

  return NextResponse.json({ ticket: classified });
});
