import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, parseRequest, assertOwnership, auditLog } from "@/lib/security";
import { getCurrentMembership } from "@/lib/org";
import { assertTicketMutate, classifyTicket } from "@/lib/tickets";
import { prisma } from "@/lib/prisma";

type RouteParams = Promise<{ id: string }>;

const UpdateTicketBody = z.object({
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  status: z.enum(["open", "pending", "closed"]).optional(),
});

/**
 * Single-ticket read. Owner/Viewer are entitled to see any ticket in
 * their org — no ownership check for them (would incorrectly 404 a
 * ticket they don't personally own but are allowed to view). Agent's
 * narrower "own tickets only" scope IS enforced here via
 * `assertOwnership`, which also gets us the package's automatic
 * `security.ownership_failed` audit event for free on denial.
 */
export const GET = withAuth<RouteParams>(async (_req, { session, params }) => {
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
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  if (membership.role === "agent") {
    assertOwnership(
      ticket ? { id: ticket.id, userId: ticket.ownerId } : null,
      session.user.id
    );
  } else if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ticket, membership });
});

export const PATCH = withAuth<RouteParams>(async (req, { session, params }) => {
  const { id } = await params;
  const input = await parseRequest(req, UpdateTicketBody);

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

  const contentChanged =
    (input.subject !== undefined && input.subject !== ticket!.subject) ||
    (input.body !== undefined && input.body !== ticket!.body);

  const nextSubject = input.subject ?? ticket!.subject;
  const nextBody = input.body ?? ticket!.body;

  let triageFields: {
    priority?: string;
    category?: string;
    sentiment?: string;
  } = {};
  let classifyUsage = null;
  if (contentChanged) {
    const { result: triage, usage } = await classifyTicket(
      nextSubject,
      nextBody
    );
    triageFields = triage;
    classifyUsage = usage;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.ticket.update({
      where: { id: ticket!.id },
      data: {
        subject: input.subject,
        body: input.body,
        status: input.status,
        ...triageFields,
      },
    });
    if (classifyUsage) {
      await tx.aIUsage.create({
        data: {
          orgId: membership.orgId,
          userId: session.user.id,
          ...classifyUsage,
        },
      });
    }
    return row;
  });

  auditLog({
    event: "ticket.update",
    resourceId: updated.id,
    metadata: { orgId: membership.orgId, status: updated.status },
  });
  if (classifyUsage) {
    auditLog({
      event: "ai.classify",
      resourceId: updated.id,
      metadata: { orgId: membership.orgId, model: classifyUsage.model },
    });
  }

  return NextResponse.json({ ticket: updated });
});
