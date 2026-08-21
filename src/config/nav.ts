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
