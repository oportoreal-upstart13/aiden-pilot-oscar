import { NextResponse } from "next/server";
import { assertCan, auditLog, parseQuery, parseRequest } from "@/lib/security";
import { withAuthRoute } from "@/lib/routes";
import { abilities } from "@/lib/abilities";
import { prisma } from "@/lib/prisma";
import { resolveActiveOrg } from "@/lib/org";
import { orgTicketsWhere } from "@/lib/tickets";
import { CreateTicketBody, ListTicketsQuery } from "@/lib/validations/tickets";
import { triageTicket } from "@/lib/triage";

const ROUTE = "/api/tickets";

/**
 * List the caller's tickets in their active organization.
 *
 * `orgTicketsWhere` applies the same boundary the detail read enforces —
 * org-wide for owners and viewers, own-tickets-only for agents — so a row
 * that appears here always opens.
 */
export const GET = withAuthRoute(async (req, { session }) => {
  const query = parseQuery(req, ListTicketsQuery);
  const membership = await resolveActiveOrg(session.user.id);
  assertCan(abilities, session, "ticket.read", membership);

  const tickets = await prisma.ticket.findMany({
    where: orgTicketsWhere(membership, session.user.id, {
      status: query.status,
    }),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit,
    select: {
      id: true,
      subject: true,
      status: true,
      priority: true,
      category: true,
      sentiment: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    activeOrgId: membership.orgId,
    role: membership.role,
    tickets,
  });
});

/**
 * Create a ticket, then classify it.
 *
 * Triage runs after the row exists and after the `ticket.create` audit
 * event, so an AI outage costs the classification and nothing else: the
 * ticket is still created, unclassified, and the request still succeeds.
 */
export const POST = withAuthRoute(async (req, { session }) => {
  const body = await parseRequest(req, CreateTicketBody);
  const membership = await resolveActiveOrg(session.user.id);
  assertCan(abilities, session, "ticket.create", membership);

  const ticket = await prisma.ticket.create({
    data: {
      orgId: membership.orgId,
      ownerId: session.user.id,
      subject: body.subject,
      body: body.body,
    },
  });

  auditLog({
    event: "ticket.create",
    resourceId: ticket.id,
    metadata: { orgId: membership.orgId, status: ticket.status },
  });

  const triaged = await triageTicket({
    subject: body.subject,
    body: body.body,
    route: `POST ${ROUTE}`,
    orgId: membership.orgId,
    userId: session.user.id,
  });

  if (!triaged) {
    return NextResponse.json({ ticket }, { status: 201 });
  }

  const classified = await prisma.ticket.update({
    where: { id: ticket.id },
    data: triaged.result,
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

  return NextResponse.json({ ticket: classified }, { status: 201 });
});
