import { redirect } from "next/navigation";
import { PageHeader } from "@upstart13-com/aiden-ui";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { abilities } from "@/lib/abilities";
import { resolveActiveOrg } from "@/lib/org";
import { MembersTable } from "@/components/members/members-table";
import type { SecuritySession } from "@upstart13-com/aiden-security";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/members");

  const securitySession = session as unknown as SecuritySession;
  const membership = await resolveActiveOrg(session.user.id);
  if (!abilities.can(securitySession, "org.members.read", membership)) {
    redirect("/dashboard");
  }

  const rows = await prisma.membership.findMany({
    where: { orgId: membership.orgId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle="Who belongs to this organization, and what they may do in it."
      />
      <div className="space-y-8 px-6 py-8">
        <MembersTable
          currentUserId={session.user.id}
          members={rows.map((row) => ({
            membershipId: row.id,
            userId: row.user.id,
            name: row.user.name,
            email: row.user.email,
            role: row.role,
            joinedAt: row.createdAt,
          }))}
        />
      </div>
    </div>
  );
}
