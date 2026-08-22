import type { DashboardNavItem } from "@upstart13-com/aiden-ui";

/**
 * Source of truth for the dashboard sidebar navigation. Imported by the
 * app shell, which decides at render time which items the caller may see.
 *
 * Two different gates live downstream of this file and must not be
 * conflated. `adminUsersNavItem` points at the starter's **global** user
 * administration and stays gated on the global `users.manage` ability.
 * `deskLineAdminNavItems` point at DeskLine's **org-scoped** admin, gated
 * on the active membership's role via an `AbilityPredicate`.
 *
 * Icon names resolve against `defaultNavIconRegistry` at render time; all
 * names used here are in the default set, so no custom registry is needed.
 */

export const primaryNavItems: DashboardNavItem[] = [
  {
    href: "/dashboard",
    label: "Tickets",
    icon: "Inbox",
    exact: true,
  },
];

export const settingsNavItem: DashboardNavItem = {
  href: "/dashboard/settings",
  label: "Settings",
  icon: "Settings",
  exact: false,
};

/** Starter global user administration — gated on `users.manage`. */
export const adminUsersNavItem: DashboardNavItem = {
  href: "/admin/users",
  label: "Users",
  icon: "Users",
  exact: false,
};

/** DeskLine org administration — gated on the active membership's role. */
export const deskLineAdminNavItems: DashboardNavItem[] = [
  { href: "/admin/members", label: "Members", icon: "Users", exact: false },
  { href: "/admin/audit", label: "Audit", icon: "Shield", exact: false },
  { href: "/admin/cost", label: "AI spend", icon: "Receipt", exact: false },
];
