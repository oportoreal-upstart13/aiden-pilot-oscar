import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import type { User } from "next-auth";
import {
  DashboardHeader,
  DashboardNav,
  Toaster,
  type DashboardNavItem,
} from "@upstart13-com/aiden-ui";
import { auth } from "@/lib/auth";
import { abilities } from "@/lib/abilities";
import { brand } from "@/config/brand";
import { aidenConfig } from "@/../aiden.config";
import {
  primaryNavItems,
  settingsNavItem,
  adminUsersNavItem,
} from "@/config/nav";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  const user = session.user as User & { id: string };

  const canManageUsers = abilities.can(session as never, "users.manage");
  const secondaryNavItems: DashboardNavItem[] = canManageUsers
    ? [adminUsersNavItem, settingsNavItem]
    : [settingsNavItem];

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <DashboardNav
        user={user}
        primaryNavItems={primaryNavItems}
        secondaryNavItems={secondaryNavItems}
        brand={brand}
        settingsHref={settingsNavItem.href}
        showBilling={aidenConfig.billing.enabled}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          user={user}
          primaryNavItems={primaryNavItems}
          secondaryNavItems={secondaryNavItems}
          brand={brand}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
