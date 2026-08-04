import { redirect } from "next/navigation";
import { PageHeader } from "@upstart13-com/aiden-ui";
import { AuditLogTable } from "@upstart13-com/aiden-ui/components/audit-log-table";
import { auth } from "@/lib/auth";
import { auditReader } from "@/lib/audit";
import { abilities } from "@/lib/abilities";
import { prisma } from "@/lib/prisma";
import { AuditOrgFilter } from "@/components/admin/audit-org-filter";

export const dynamic = "force-dynamic";

interface AuditLogPageProps {
  searchParams: Promise<{ orgId?: string }>;
}

export default async function AuditLogPage({
  searchParams,
}: AuditLogPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/audit");

  // Server-side ability check. Members get bounced to /dashboard.
  if (!abilities.can(session as never, "audit.read")) {
    redirect("/dashboard");
  }

  const { orgId } = await searchParams;

  // DeskLine's ticket/member audit events carry `orgId` inside the JSON
  // `metadata` column (see src/app/api/tickets/**). AuditReader's filter
  // set doesn't cover that, so query it directly via Prisma's JSON path
  // operator when a tenant filter is requested.
  const entries = orgId
    ? (
        await prisma.auditLog.findMany({
          where: { metadata: { path: ["orgId"], equals: orgId } },
          orderBy: { timestamp: "desc" },
          take: 100,
        })
      ).map((row) => ({
        ...row,
        metadata: row.metadata as Record<string, unknown> | null,
      }))
    : (await auditReader.list({ limit: 100 })).entries;

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Showing the most recent 100 events. Sign-in, sign-out, registration, ownership failures, and ability denials are recorded automatically."
      />
      <div className="space-y-8 px-6 py-8">
        <AuditOrgFilter initialOrgId={orgId ?? ""} />
        <AuditLogTable entries={entries} />
      </div>
    </div>
  );
}
