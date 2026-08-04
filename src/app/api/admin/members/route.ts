import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, parseRequest, assertCan, auditLog } from "@/lib/security";
import { abilities } from "@/lib/abilities";
import { getCurrentMembership } from "@/lib/org";
import { prisma } from "@/lib/prisma";

const AddMemberBody = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "agent", "viewer"]),
});

export const GET = withAuth(async (_req, { session }) => {
  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return NextResponse.json(
      { error: "You haven't been added to an organization yet." },
      { status: 403 }
    );
  }
  assertCan(abilities, session, "members.manage", { role: membership.role });

  const members = await prisma.membership.findMany({
    where: { orgId: membership.orgId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ members });
});

/**
 * Adds an *existing* registered user to the caller's org — no invite
 * tokens or self-service org creation in this app; an owner grows their
 * org by referencing an already-registered account by email.
 */
export const POST = withAuth(async (req, { session }) => {
  const input = await parseRequest(req, AddMemberBody);

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return NextResponse.json(
      { error: "You haven't been added to an organization yet." },
      { status: 403 }
    );
  }
  assertCan(abilities, session, "members.manage", { role: membership.role });

  const targetUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (!targetUser) {
    return NextResponse.json(
      { error: "No registered user with that email." },
      { status: 404 }
    );
  }

  const existing = await prisma.membership.findUnique({
    where: { orgId_userId: { orgId: membership.orgId, userId: targetUser.id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "That user is already a member of this organization." },
      { status: 400 }
    );
  }

  const created = await prisma.membership.create({
    data: { orgId: membership.orgId, userId: targetUser.id, role: input.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  auditLog({
    event: "member.added",
    resourceId: created.id,
    metadata: { orgId: membership.orgId, role: input.role },
  });

  return NextResponse.json({ member: created }, { status: 201 });
});
