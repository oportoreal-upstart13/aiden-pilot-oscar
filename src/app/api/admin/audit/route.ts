import { NextResponse } from "next/server";
import { withAuth } from "@/lib/security";
import { auditReader } from "@/lib/audit";
import { abilities } from "@/lib/abilities";
import { getCurrentMembership } from "@/lib/org";
import { prisma } from "@/lib/prisma";

const MAX_LIMIT = 200;

/**
 * Two independent gates share this one read endpoint — not blended,
 * just co-located:
 *  - Platform `admin` role (pre-existing, unrelated RBAC system): full
 *    cross-org view, optional `orgId` filter.
 *  - DeskLine org `owner` (Membership role): always scoped to THEIR
 *    OWN org, no `orgId` param needed or honored — an owner can't use
 *    this to peek at another org's audit trail.
 * Neither role → 403.
 */
export const GET = withAuth(async (req, { session }) => {
  const isPlatformAdmin = abilities.can(session, "audit.read");
  const membership = isPlatformAdmin
    ? null
    : await getCurrentMembership(session.user.id);
  const isOrgOwner = membership?.role === "owner";

  if (!isPlatformAdmin && !isOrgOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = clamp(
    parseInt(url.searchParams.get("limit") ?? "50", 10),
    1,
    MAX_LIMIT
  );
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const event = url.searchParams.get("event") ?? undefined;
  const userId = url.searchParams.get("userId") ?? undefined;
  // Platform admins may filter by any orgId; an org owner is always
  // pinned to their own org regardless of what they pass.
  const orgId = isOrgOwner
    ? membership!.orgId
    : url.searchParams.get("orgId") ?? undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  // `orgId` isn't part of AuditReader's filter set (it only knows about
  // actorId/event/timestamp) since orgId lives inside the JSON `metadata`
  // column every DeskLine audit call writes. Query it directly via
  // Prisma's JSON path filter rather than raw SQL — no `nextCursor` in
  // this branch, it's an admin debugging view, not the primary feed.
  if (orgId) {
    const entries = await prisma.auditLog.findMany({
      where: {
        metadata: { path: ["orgId"], equals: orgId },
        ...(event ? { event } : {}),
        ...(userId ? { actorId: userId } : {}),
        ...(from || to
          ? {
              timestamp: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
    return NextResponse.json({ entries, nextCursor: null });
  }

  const page = await auditReader.list({
    limit,
    cursor,
    event,
    userId,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });

  return NextResponse.json(page);
});

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(Math.max(n, lo), hi);
}
