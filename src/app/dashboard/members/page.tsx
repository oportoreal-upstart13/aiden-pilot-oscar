import { redirect } from "next/navigation";
import { PageHeader } from "@upstart13-com/aiden-ui";
import { auth } from "@/lib/auth";
import { abilities } from "@/lib/abilities";
import { getCurrentMembership } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { AddMemberDialog } from "@/components/members/add-member-dialog";
import { MembersTable } from "@/components/members/members-table";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/members");

  const membership = await getCurrentMembership(session.user.id);
  if (
    !membership ||
    !abilities.can(session as never, "members.manage", {
      role: membership.role,
    })
  ) {
    redirect("/dashboard");
  }

  const members = await prisma.membership.findMany({
    where: { orgId: membership.orgId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle={`Who has access to ${membership.org.name}.`}
        action={<AddMemberDialog />}
      />
      <div className="space-y-8 px-6 py-8">
        <MembersTable members={members} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
