import { redirect } from "next/navigation";
import { PageHeader } from "@upstart13-com/aiden-ui";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { abilities } from "@/lib/abilities";
import { UsersTable } from "@/components/admin/users-table";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/users");
  if (!abilities.can(session as never, "users.manage")) {
    redirect("/dashboard");
  }

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      take: 26,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
        roles: { select: { name: true } },
      },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { name: true, description: true },
    }),
  ]);

  const hasMore = users.length > 25;
  const rows = hasMore ? users.slice(0, 25) : users;

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Assign or revoke roles for users in your app."
      />
      <div className="space-y-8 px-6 py-8">
        <UsersTable
          initialUsers={rows.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            image: u.image,
            createdAt: u.createdAt.toISOString(),
            roles: u.roles.map((r) => r.name),
          }))}
          initialNextCursor={hasMore ? rows[rows.length - 1]!.id : null}
          availableRoles={roles}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
