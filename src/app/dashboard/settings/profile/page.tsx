import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileSection } from "@/components/settings/profile-section";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/settings/profile");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
      accounts: {
        select: { provider: true, providerAccountId: true },
      },
      roles: {
        select: { name: true, description: true },
      },
    },
  });

  if (!user) redirect("/login");

  return (
    <ProfileSection
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt.toISOString(),
        accounts: user.accounts,
        roles: user.roles,
      }}
    />
  );
}
