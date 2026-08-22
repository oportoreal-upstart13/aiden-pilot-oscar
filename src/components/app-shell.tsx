import type { ReactNode } from "react";
import type { User } from "next-auth";
import {
  DashboardHeader,
  DashboardNav,
  type DashboardNavItem,
} from "@upstart13-com/aiden-ui";
import { abilities } from "@/lib/abilities";
import { prisma } from "@/lib/prisma";
import { resolveActiveOrg } from "@/lib/org";
import { brand } from "@/config/brand";
import { aidenConfig } from "@/../aiden.config";
import {
  adminUsersNavItem,
  deskLineAdminNavItems,
  primaryNavItems,
  settingsNavItem,
} from "@/config/nav";
import { OrgSwitcher } from "@/components/org/org-switcher";
import type { SecuritySession } from "@upstart13-com/aiden-security";

/**
 * The application chrome, shared by `/dashboard` and `/admin` so both
 * segments get the same sidebar, mobile header and organization context.
 *
 * The organization bar sits between `DashboardHeader` and `<main>`, i.e.
 * outside `<main>`, so `PageHeader` remains the first element inside it —
 * `08-page-layouts.md` forbids anything above the page header. It exists
 * because neither `DashboardNav` nor `DashboardHeader` accepts a content
 * slot; that gap is recorded in `.claude/fixes/ui.md` for upstream.
 */
interface AppShellProps {
  session: SecuritySession;
  children: ReactNode;
}

export async function AppShell({ session, children }: AppShellProps) {
  const user = session.user as User & { id: string };
  const membership = await resolveActiveOrg(session.user.id);

  // Org-scoped: the resource is the active membership, so the same person
  // sees the admin section in the organization they own and not in one
  // where they are an agent.
  const canAdminister = abilities.can(
    session,
    "org.members.read",
    membership
  );
  // Global, and a different authority: the starter's cross-tenant user
  // administration. Never derived from the org role.
  const canManageGlobalUsers = abilities.can(session, "users.manage");

  const secondaryNavItems: DashboardNavItem[] = [
    ...(canAdminister ? deskLineAdminNavItems : []),
    ...(canManageGlobalUsers ? [adminUsersNavItem] : []),
    settingsNavItem,
  ];

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { role: true, org: { select: { id: true, name: true } } },
  });

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
        <div className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
          <OrgSwitcher
            activeOrgId={membership.orgId}
            organizations={memberships.map((row) => ({
              orgId: row.org.id,
              name: row.org.name,
              role: row.role,
            }))}
          />
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
