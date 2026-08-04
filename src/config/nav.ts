import type { DashboardNavItem } from "@upstart13-com/aiden-ui";

/**
 * Source of truth for the dashboard sidebar navigation. Imported by
 * the layout, which decides at render-time whether the user can see
 * each item (e.g. the Admin → Users entry is gated by `users.manage`).
 *
 * Icon names are resolved against `defaultNavIconRegistry` from
 * `@upstart13-com/aiden-ui` at render time. Pass a custom registry to
 * `DashboardNav`/`MobileNav`/`DashboardHeader` to register additional
 * icons; see `@upstart13-com/aiden-ui/layout/nav-icons`.
 */

export const primaryNavItems: DashboardNavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: "LayoutDashboard",
    exact: true,
  },
  {
    href: "/dashboard/tickets",
    label: "Tickets",
    icon: "Inbox",
    exact: false,
  },
];

export const settingsNavItem: DashboardNavItem = {
  href: "/dashboard/settings",
  label: "Settings",
  icon: "Settings",
  exact: false,
};

export const adminUsersNavItem: DashboardNavItem = {
  href: "/admin/users",
  label: "Users",
  icon: "Users",
  exact: false,
};

/** Org member management — gated to the "owner" role, see dashboard layout. */
export const orgMembersNavItem: DashboardNavItem = {
  href: "/dashboard/members",
  label: "Members",
  icon: "Users",
  exact: false,
};

/** Org-scoped audit trail — gated to the "owner" role. */
export const orgAuditNavItem: DashboardNavItem = {
  href: "/dashboard/audit",
  label: "Audit",
  icon: "Shield",
  exact: false,
};

/** Org AI cost/usage view — gated to the "owner" role. */
export const orgUsageNavItem: DashboardNavItem = {
  href: "/dashboard/usage",
  label: "AI usage",
  icon: "BarChart3",
  exact: false,
};
