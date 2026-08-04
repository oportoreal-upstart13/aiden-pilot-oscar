import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, parseRequest, assertCan, auditLog } from "@/lib/security";
import { abilities } from "@/lib/abilities";
import { getCurrentMembership } from "@/lib/org";
import { getVisibleTicketsWhere, classifyTicket } from "@/lib/tickets";
import { prisma } from "@/lib/prisma";

const CreateTicketBody = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

/**
 * Read visibility is role-shaped at the query level, not an ability
 * check — Owner/Viewer see every ticket in their org; Agent sees only
 * their own. See getVisibleTicketsWhere for the rationale.
 */
export const GET = withAuth(async (_req, { session }) => {
  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return NextResponse.json(
      { error: "You haven't been added to an organization yet." },
      { status: 403 }
    );
  }

  const tickets = await prisma.ticket.findMany({
    where: getVisibleTicketsWhere(membership),
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ tickets, membership });
});

/**
 * Ticket creation is Agent-only (assertCan — no row exists yet, so no
 * ownership check applies). Auto-triages via `classifyTicket` before
 * responding — priority/category/sentiment are always AI-set, never
 * client input.
 */
export const POST = withAuth(async (req, { session }) => {
  const input = await parseRequest(req, CreateTicketBody);

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return NextResponse.json(
      { error: "You haven't been added to an organization yet." },
      { status: 403 }
    );
  }
  assertCan(abilities, session, "ticket.create", { role: membership.role });

  const { result: triage, usage } = await classifyTicket(
    input.subject,
    input.body
  );

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({
      data: {
        orgId: membership.orgId,
        ownerId: session.user.id,
        subject: input.subject,
        body: input.body,
        priority: triage.priority,
        category: triage.category,
        sentiment: triage.sentiment,
      },
    });
    await tx.aIUsage.create({
      data: { orgId: membership.orgId, userId: session.user.id, ...usage },
    });
    return created;
  });

  auditLog({
    event: "ticket.create",
    resourceId: ticket.id,
    metadata: { orgId: membership.orgId },
  });
  auditLog({
    event: "ai.classify",
    resourceId: ticket.id,
    metadata: { orgId: membership.orgId, model: usage.model },
  });

  return NextResponse.json({ ticket }, { status: 201 });
});
