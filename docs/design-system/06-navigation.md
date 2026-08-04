# Design System — Navigation

> **Source of truth:** [Figma Smithers DS — Navigation / GlobalNav](https://www.figma.com/design/eHCER1DdlXffFVUlU8L3lc/Alacrity?node-id=1813-1074). Active items use the violet pill (`bg-sidebar-accent`), not inverted surfaces.

## App Layout Structure

```
Desktop:
┌─────────────────────────────────────────────────────┐
│  Sidebar (w-56 = 224px, fixed)  │  Main Content     │
│  ────────────────────────────   │  ──────────────   │
│  Brand: Upstart13 [AI]          │  Page Header      │
│  ────────────────────────────   │  ──────────────   │
│  [Platform] section label       │  Page Content     │
│  • Overview                     │  px-6 py-8        │
│  • Projects                     │                   │
│  • Models                       │                   │
│  • API Keys                     │                   │
│  ────────────────────────────   │                   │
│  • Billing                      │                   │
│  • Settings                     │                   │
│  ────────────────────────────   │                   │
│  [User menu dropdown]           │                   │
└─────────────────────────────────────────────────────┘

Mobile:
┌──────────────────────────────────────────┐
│  [☰] Upstart13              [theme]      │  ← DashboardHeader (h-14, lg:hidden)
│──────────────────────────────────────────│
│  Page Header                             │
│──────────────────────────────────────────│
│  Page Content                            │
└──────────────────────────────────────────┘
Mobile sidebar opens as Sheet from left (MobileNav component)
```

## Sidebar

**Component:** `DashboardNav` from `@upstart13-com/aiden-ui` (package-owned — do not edit locally; configure it via props). The structure below is for reference:

```tsx
"use client"

// Accepts: user: User & { id: string }
// Located: hidden w-56 ... lg:flex flex-col

<aside className="hidden w-56 border-r border-border bg-background lg:flex flex-col shrink-0">
  {/* Brand */}
  <div className="flex h-14 items-center border-b border-border px-5 shrink-0">
    <Link href="/" className="flex items-baseline gap-1.5">
      <span className="font-bold text-sm tracking-tight">Upstart13</span>
      <span className="font-mono text-[11px] text-accent tracking-widest">[AI]</span>
    </Link>
  </div>

  {/* Primary nav */}
  <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
    <p className="px-2 pb-2 text-[10px] font-medium tracking-widest uppercase text-muted-foreground font-mono">
      Platform
    </p>
    {primaryNavItems.map(...)}
  </nav>

  {/* Secondary nav + User menu */}
  <div className="px-3 pb-3 border-t border-border pt-3 space-y-0.5 shrink-0">
    <Separator className="mb-3" />
    {secondaryNavItems.map(...)}
    <UserDropdown user={user} />
  </div>
</aside>
```

## Nav Items

**Source of truth:** `src/config/nav.ts` — the starter declares its nav items here and passes them into the package-owned `DashboardNav`/`DashboardHeader`/`MobileNav` as props. Icons are referenced by name (resolved against `defaultNavIconRegistry` from `@upstart13-com/aiden-ui`), not imported components.

```ts
import type { DashboardNavItem } from "@upstart13-com/aiden-ui";

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
```

**Secondary nav is RBAC-gated.** There is no static `secondaryNavItems` export — the dashboard layout builds it at render time and only includes the Admin → Users entry when the session holds the `users.manage` ability:

```tsx
// src/app/dashboard/layout.tsx (server component)
const canManageUsers = abilities.can(session, "users.manage");
const secondaryNavItems: DashboardNavItem[] = canManageUsers
  ? [adminUsersNavItem, settingsNavItem]
  : [settingsNavItem];

<DashboardNav
  user={user}
  primaryNavItems={primaryNavItems}
  secondaryNavItems={secondaryNavItems}
/>;
```

> Do not hardcode the Admin entry into a static array — that would expose admin nav to non-admins. Always derive admin-visible items from an ability check.

**Active item detection:**

```ts
const isActive = (href: string, exact: boolean) =>
  exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");
```

**Active styling:**

```tsx
isActive(href, exact)
  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" // violet-100 bg, violet-700 text
  : "text-muted-foreground hover:bg-muted hover:text-foreground";
```

The `--sidebar-accent` and `--sidebar-accent-foreground` tokens map to the Smithers DS active pill: a violet-100 surface with violet-700 text in light mode, and a translucent violet wash with violet-300 text in dark mode.

## User Menu (Sidebar Bottom)

Lives at the bottom of the sidebar in a `DropdownMenu`. Uses `signOut` from `next-auth/react` (client-side).

```tsx
import { signOut } from "next-auth/react";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="hover:bg-muted flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-sm transition-colors">
      <Avatar className="size-6 shrink-0">
        <AvatarImage src={user.image ?? undefined} />
        <AvatarFallback className="text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm leading-none font-medium">{user.name}</p>
      </div>
      <ChevronsUpDown
        className="text-muted-foreground size-3.5 shrink-0"
        strokeWidth={1.5}
      />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" side="top" className="w-52">
    <DropdownMenuLabel className="font-normal">
      <p className="text-sm font-medium">{user.name}</p>
      <p className="text-muted-foreground text-xs">{user.email}</p>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem asChild>
      <Link href="/settings">Settings</Link>
    </DropdownMenuItem>
    <DropdownMenuItem asChild>
      <Link href="/billing">Billing</Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      <LogOut className="mr-2 size-4" strokeWidth={1.5} />
      Sign out
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>;
```

## Mobile Navigation

**Component:** `MobileNav` from `@upstart13-com/aiden-ui` (package-owned; rendered by `DashboardHeader`).

Renders a hamburger button (Sheet trigger) + Sheet content with the full nav + user info.
Only visible on mobile (`lg:hidden` via the DashboardHeader).

```tsx
// Imported by DashboardHeader:
<MobileNav user={user} />
```

The Sheet contains:

- Brand mark
- primaryNavItems + Separator + secondaryNavItems
- User info + sign out at the bottom

## Dashboard Header (Mobile Only)

**Component:** `DashboardHeader` from `@upstart13-com/aiden-ui` (package-owned).

Only visible on mobile (`lg:hidden`). Contains:

- `<MobileNav>` (left) — hamburger + Sheet
- Brand name (center)
- `<ThemeToggle>` (right)

```tsx
<header className="border-border bg-background sticky top-0 z-40 flex h-14 items-center justify-between border-b px-4 lg:hidden">
  <MobileNav user={user} />
  <span className="text-sm font-bold tracking-tight">Upstart13</span>
  <ThemeToggle />
</header>
```

On desktop, the ThemeToggle lives in the sidebar's user dropdown menu area. Consider adding it to the sidebar footer if needed.

## Dashboard Layout

**File:** `src/app/dashboard/layout.tsx`

```tsx
// Server component — reads session, guards auth, builds ability-gated nav, passes to package primitives
export default async function DashboardLayout({ children }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");
  const user = session.user as User & { id: string };

  const canManageUsers = abilities.can(session, "users.manage");
  const secondaryNavItems = canManageUsers
    ? [adminUsersNavItem, settingsNavItem]
    : [settingsNavItem];

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <DashboardNav
        user={user}
        primaryNavItems={primaryNavItems}
        secondaryNavItems={secondaryNavItems}
      />{" "}
      {/* desktop sidebar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          user={user}
          primaryNavItems={primaryNavItems}
          secondaryNavItems={secondaryNavItems}
        />{" "}
        {/* mobile top bar only */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
```

## Page Header

Every dashboard page has a page header as the FIRST element inside the page component (rendered inside `<main>`). Use the `PageHeader` primitive from `@upstart13-com/aiden-ui` — do not hand-roll the wrapper.

```tsx
import { PageHeader, Button } from "@upstart13-com/aiden-ui";
import { Plus } from "lucide-react";

<PageHeader
  title="Page Title"
  subtitle="Supporting description — one line max."
  action={
    <Button size="sm" className="rounded-sm">
      <Plus className="mr-1.5 size-4" strokeWidth={1.5} />
      Primary Action
    </Button>
  }
/>;
```

`PageHeader` renders the canonical contract — `border-b border-border px-6 py-5` with the title row inside:

```tsx
<div className="border-border border-b px-6 py-5">
  <div className="flex items-start justify-between">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && (
        <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
      )}
    </div>
    {action}
  </div>
</div>
```

**Rules:**

- Title: `text-2xl font-bold tracking-tight` — always present (the `title` prop)
- Subtitle: `text-sm text-muted-foreground mt-1` — optional, one line (the `subtitle` prop)
- Action: right-aligned primary button — one per page, `size="sm"` (the `action` prop)
- Always has `border-b border-border` — `PageHeader` enforces this; never skip it

## Page Content Area

```tsx
<div className="space-y-8 px-6 py-8">{/* sections */}</div>
```

Section spacing: `space-y-8`. Page padding: `px-6 py-8`.
For settings/form-only pages: add `max-w-2xl` to the content div.

## Sidebar Width

`w-56` (224px). Never change this. The design system shows `w-60` (240px) in earlier docs — the implementation uses `w-56`. Use `w-56`.

## Navigation Rules

1. **Sidebar width**: `w-56` (224px) — fixed
2. **Active item**: violet pill via `bg-sidebar-accent text-sidebar-accent-foreground` (Smithers DS pattern)
3. **Nav items**: always icon + text — never icon-only
4. **Section labels**: `text-[10px] font-medium tracking-widest uppercase font-mono text-muted-foreground`
5. **User menu**: always at the bottom of the sidebar
6. **Mobile**: Sheet nav via `MobileNav` component, triggered from `DashboardHeader`
7. **Page header**: every dashboard page has one — `border-b border-border px-6 py-5`
8. **Sign out**: use `signOut` from `next-auth/react` in client components

---

## Do's and Don'ts

### Do

- Style active nav items with the violet pill: `bg-sidebar-accent text-sidebar-accent-foreground`
- Render icon + label on every nav item
- Keep the sidebar width fixed at `w-56` (224px)
- Anchor the user menu at the bottom of the sidebar
- Start every dashboard page with a page header: `border-b border-border px-6 py-5`
- Set `exact: true` on routes where a prefix match would catch children incorrectly (e.g. `/dashboard`)

### Don't

- Style active nav items with raw color utilities (`bg-violet-100`, `text-purple-700`) — go through the `--sidebar-accent` tokens
- Ship icon-only nav items (sidebar or mobile Sheet) — always paired with text
- Resize the sidebar responsively — it's `w-56` on desktop, `Sheet` on mobile
- Duplicate the nav list inside components — import from `src/config/nav.ts`
- Omit the page header on a dashboard page — it anchors the layout
- Change the mobile header height from `h-14`
