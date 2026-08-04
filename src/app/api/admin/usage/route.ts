import { NextResponse } from "next/server";
import { withAuth } from "@/lib/security";
import { getCurrentMembership } from "@/lib/org";
import { prisma } from "@/lib/prisma";

/** Owner-only, org-scoped AIUsage spend view. */
export const GET = withAuth(async (_req, { session }) => {
  const membership = await getCurrentMembership(session.user.id);
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const usage = await prisma.aIUsage.findMany({
    where: { orgId: membership.orgId },
    orderBy: { createdAt: "desc" },
  });

  const totalCostUsd = usage.reduce((sum, row) => sum + Number(row.costUsd), 0);
  const totalCalls = usage.length;

  return NextResponse.json({ usage, totalCostUsd, totalCalls });
});
