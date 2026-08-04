import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditReader } from "@/lib/audit";
import { aidenConfig } from "@/../aiden.config";
import { SecuritySection } from "@/components/settings/security-section";

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/settings/security");
  }

  const [user, signins] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    }),
    auditReader.list({
      userId: session.user.id,
      event: "auth.signin",
      limit: 10,
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <SecuritySection
      hasPassword={user.passwordHash !== null}
      credentialsEnabled={aidenConfig.auth.providers.credentials}
      recentSignins={signins.entries.map((e) => ({
        id: e.id,
        timestamp: e.timestamp.toISOString(),
        ipAddress: e.ipAddress,
        userAgent: e.userAgent,
      }))}
    />
  );
}
