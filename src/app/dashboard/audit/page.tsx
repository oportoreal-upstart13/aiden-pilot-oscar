import { redirect } from "next/navigation";
import { PageHeader } from "@upstart13-com/aiden-ui";
import { AuditLogTable } from "@upstart13-com/aiden-ui/components/audit-log-table";
import { auth } from "@/lib/auth";
import { getCurrentMembership } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Owner-only, org-scoped audit trail — always the caller's own org, no
 * filter param needed or honored. Deliberately separate from
 * `/admin/audit` (the pre-existing platform-superadmin view, gated by
 * an unrelated RBAC system) rather than threading owner access through
 * that layout's backstop guard.
 */
export default async function OrgAuditPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/audit");

  const membership = await getCurrentMembership(session.user.id);
  if (!membership || membership.role !== "owner") {
    redirect("/dashboard");
  }

  const entries = (
    await prisma.auditLog.findMany({
      where: { metadata: { path: ["orgId"], equals: membership.orgId } },
      orderBy: { timestamp: "desc" },
      take: 100,
    })
  ).map((row) => ({
    ...row,
    metadata: row.metadata as Record<string, unknown> | null,
  }));

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle={`Recent activity in ${membership.org.name} — ticket changes, AI calls, and member changes.`}
      />
      <div className="space-y-8 px-6 py-8">
        <AuditLogTable entries={entries} />
      </div>
    </div>
  );
}
