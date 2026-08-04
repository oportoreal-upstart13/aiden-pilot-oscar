import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, parseRequest, assertCan, auditLog } from "@/lib/security";
import { abilities } from "@/lib/abilities";
import { getCurrentMembership } from "@/lib/org";
import { prisma } from "@/lib/prisma";

type RouteParams = Promise<{ id: string }>;

const UpdateMemberBody = z.object({
  role: z.enum(["owner", "agent", "viewer"]),
});

async function loadOrgScopedMember(id: string, orgId: string) {
  return prisma.membership.findFirst({ where: { id, orgId } });
}

export const PATCH = withAuth<RouteParams>(async (req, { session, params }) => {
  const { id } = await params;
  const input = await parseRequest(req, UpdateMemberBody);

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return NextResponse.json(
      { error: "You haven't been added to an organization yet." },
      { status: 403 }
    );
  }
  assertCan(abilities, session, "members.manage", { role: membership.role });

  const target = await loadOrgScopedMember(id, membership.orgId);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (target.role === "owner" && input.role !== "owner") {
    const ownerCount = await prisma.membership.count({
      where: { orgId: membership.orgId, role: "owner" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "An organization must keep at least one owner." },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.membership.update({
    where: { id: target.id },
    data: { role: input.role },
  });

  auditLog({
    event: "member.role_change",
    resourceId: updated.id,
    metadata: { orgId: membership.orgId, role: updated.role },
  });

  return NextResponse.json({ member: updated });
});

export const DELETE = withAuth<RouteParams>(async (_req, { session, params }) => {
  const { id } = await params;

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return NextResponse.json(
      { error: "You haven't been added to an organization yet." },
      { status: 403 }
    );
  }
  assertCan(abilities, session, "members.manage", { role: membership.role });

  const target = await loadOrgScopedMember(id, membership.orgId);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (target.role === "owner") {
    const ownerCount = await prisma.membership.count({
      where: { orgId: membership.orgId, role: "owner" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "An organization must keep at least one owner." },
        { status: 400 }
      );
    }
  }

  await prisma.membership.delete({ where: { id: target.id } });

  auditLog({
    event: "member.removed",
    resourceId: target.id,
    metadata: { orgId: membership.orgId },
  });

  return NextResponse.json({ ok: true });
});
