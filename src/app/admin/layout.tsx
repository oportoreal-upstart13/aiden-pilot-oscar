import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { abilities } from "@/lib/abilities";
import { AppShell } from "@/components/app-shell";
import type { SecuritySession } from "@upstart13-com/aiden-security";

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Segment guard for everything under `/admin`, and the reason the admin
 * pages get the same chrome as the dashboard.
 *
 * The guard here is deliberately **coarse**: it answers "is this person an
 * administrator of anything at all", and bounces everyone else. It cannot
 * be the precise gate, because two unrelated authorities live under this
 * segment — DeskLine's org-scoped pages (`members`, `audit`, `cost`, gated
 * on the active membership's role) and the starter's cross-tenant
 * `/admin/users` (gated on the global `users.manage`). A layout cannot
 * tell which child is rendering, so each page keeps its own exact check
 * and this is only the backstop.
 *
 * The previous version gated on the global `users.manage` / `audit.read`
 * only, which locked every DeskLine owner out of their own organization's
 * administration.
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin");

  const securitySession = session as unknown as SecuritySession;

  const ownsAnyOrg =
    (await prisma.membership.count({
      where: { userId: session.user.id, role: "owner" },
    })) > 0;

  const isGlobalAdmin =
    abilities.can(securitySession, "users.manage") ||
    abilities.can(securitySession, "audit.read");

  if (!ownsAnyOrg && !isGlobalAdmin) {
    redirect("/dashboard");
  }

  return <AppShell session={securitySession}>{children}</AppShell>;
}
