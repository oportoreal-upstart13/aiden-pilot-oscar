import "server-only";
import { prisma } from "@/lib/prisma";

/** Org-scoped role. Distinct from the platform RBAC roles in `@/config/rbac`. */
export type OrgRole = "owner" | "agent" | "viewer";

export interface CurrentMembership {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  org: { id: string; name: string };
}

/**
 * Resolves the org a user currently operates in. Every ticket/member
 * route calls this right after `withAuth` — it's the multi-tenancy
 * anchor: all subsequent DB reads filter by `membership.orgId`, never
 * by a client-supplied org id.
 *
 * A user is assumed to belong to at most one org for this app (no org
 * switcher) — the earliest Membership row wins. Returns `null` if the
 * user hasn't been added to an org yet (fresh registrants start here).
 */
export async function getCurrentMembership(
  userId: string
): Promise<CurrentMembership | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { org: { select: { id: true, name: true } } },
  });
  return membership as CurrentMembership | null;
}
