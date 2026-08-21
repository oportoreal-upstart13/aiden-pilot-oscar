import { redirect } from "next/navigation";
import { PageHeader } from "@upstart13-com/aiden-ui";
import { AuditLogTable } from "@upstart13-com/aiden-ui/components/audit-log-table";
import { auth } from "@/lib/auth";
import { auditReader } from "@/lib/audit";
import { abilities } from "@/lib/abilities";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/audit");

  // Server-side ability check. Members get bounced to /dashboard.
  if (!abilities.can(session as never, "audit.read")) {
    redirect("/dashboard");
  }

  const { entries } = await auditReader.list({ limit: 100 });

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Showing the most recent 100 events. Sign-in, sign-out, registration, ownership failures, and ability denials are recorded automatically."
      />
      <div className="space-y-8 px-6 py-8">
        <AuditLogTable entries={entries} />
      </div>
    </div>
  );
}
