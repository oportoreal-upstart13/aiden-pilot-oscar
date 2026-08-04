# Design System — Page Layouts

> **Source of truth:** [Figma Smithers DS](https://www.figma.com/design/eHCER1DdlXffFVUlU8L3lc/Alacrity?node-id=1813-1074).

## Dashboard Page (data-rich)

Standard layout for pages with metrics, tables, or charts.

```tsx
import { PageHeader, Button } from "@upstart13-com/aiden-ui";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your AI projects and usage."
        action={
          <Button>
            <Plus className="mr-2 size-4" strokeWidth={1.5} />
            New Project
          </Button>
        }
      />

      {/* Page Content */}
      <div className="space-y-8 px-6 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* ... MetricCard × 4 */}
        </div>

        {/* Main Table / Chart Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          {/* ... DataTable */}
        </div>
      </div>
    </div>
  );
}
```

---

## Settings Page

Two-column layout: sidebar nav on the left, content on the right. On mobile, stacks vertically.

```tsx
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your account and preferences."
      />

      <div className="px-6 py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          {/* Settings Nav — local component, hardcoded items, no props */}
          <SettingsNav />

          {/* Settings Content */}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
```

The starter ships `SettingsNav` at `src/components/settings/settings-nav.tsx`. It takes no props and renders the real settings routes — Profile (`/dashboard/settings/profile`), Security (`/dashboard/settings/security`), Appearance (`/dashboard/settings/appearance`), and Data & Privacy (`/dashboard/settings/data-privacy`). Edit that file to add or rename sections; do not reference a `SettingsNavItem` component (there isn't one).

### Settings Section Pattern

Each settings section is a `Card` with a clear title and description.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Display Name</CardTitle>
    <CardDescription>
      This is how your name will appear across the platform.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Save
          </Button>
        </div>
      </form>
    </Form>
  </CardContent>
</Card>
```

---

## Auth Pages (Login / Signup)

Centered, minimal, dark background.

```tsx
export default function LoginPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">[up]start.13</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Sign in to your account
          </p>
        </div>

        {/* Auth Card */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            {/* OAuth Buttons */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={signInWithGoogle}
              >
                <GoogleIcon className="mr-2 size-4" />
                Continue with Google
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={signInWithGitHub}
              >
                <Github className="mr-2 size-4" />
                Continue with GitHub
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card text-muted-foreground px-2">or</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in…" : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer link */}
        <p className="text-muted-foreground text-center text-sm">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-foreground font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

## Detail / Record Page

For viewing a single record (project, user, API key, etc.).

> `PageHeader` covers the title + optional subtitle + optional action. A detail page also needs a **breadcrumb above the title**, which `PageHeader`'s API doesn't model — so this one case inlines the header wrapper. Match the same `border-b border-border px-6 py-5` contract `PageHeader` renders.

```tsx
export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      {/* Header with breadcrumb (PageHeader has no breadcrumb slot — inline this case) */}
      <div className="border-border border-b px-6 py-5">
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/projects">
                Projects
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Project Alpha</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Project Alpha</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              AI pipeline · Created Feb 20, 2026
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Edit</Button>
            <Button variant="destructive">Delete</Button>
          </div>
        </div>
      </div>

      {/* Tabs for detail sections */}
      <div className="px-6 pt-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* overview content */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

---

## Danger Zone Card

Used at the bottom of settings pages for irreversible actions (archive, delete). Always the last card on the page.

```tsx
<Card className="border-destructive/30 rounded-sm">
  <CardHeader>
    <CardTitle className="text-destructive">Danger zone</CardTitle>
    <CardDescription>Irreversible actions for this resource.</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Archive row */}
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">Archive project</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Mark as inactive. Counts toward plan limit.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={handleArchive}
      >
        Archive
      </Button>
    </div>
    <Separator />
    {/* Delete row */}
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">Delete project</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Permanently delete all data. Cannot be undone.
        </p>
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="shrink-0"
        onClick={handleDelete}
      >
        Delete
      </Button>
    </div>
  </CardContent>
</Card>
```

**Rules:**

- Border: `border-destructive/30` — a muted red, not full destructive
- Title: `text-destructive` — signals the zone without full red treatment on the card
- Each row: `flex items-center justify-between gap-4` with a `shrink-0` button
- Archive/restore uses `variant="outline"`, not destructive — it's reversible
- Delete uses `variant="destructive"` — it is not
- Always separate rows with `<Separator />`
- Wrap the content area in `max-w-2xl` to keep settings forms readable

---

## Page Layout Rules

1. **Every page has a page header** with `border-b border-border px-6 py-5` — no exceptions
2. **Page content padding**: `px-6 py-8` — consistent across all pages
3. **Max content width**: no max-width constraint on the content div — let it fill available space. Use `max-w-2xl` or `max-w-3xl` only for settings/form-only pages.
4. **Auth pages**: centered, `min-h-screen`, `max-w-sm` card
5. **Section spacing within pages**: `space-y-8` — never `space-y-4` (too tight) or `space-y-16` (too loose)
6. **No full-page loading spinners** — use page-level skeletons with the real layout chrome intact
7. **Detail pages use Tabs** when there are 2+ distinct content sections
8. **Settings uses Card-per-section** pattern — each setting group is its own Card

---

## Do's and Don'ts

### Do

- Start every dashboard page with the page-header wrapper: `border-b border-border px-6 py-5`
- Use `px-6 py-8 space-y-8` for main content areas
- Constrain settings / form-only content to `max-w-2xl`
- Use `Tabs` on detail pages with 2+ content sections
- Place the Danger Zone card last on a settings page
- Center auth cards with `max-w-sm` on a `min-h-screen` background

### Don't

- Apply a global `max-w-*` to dashboard pages — let data views fill the canvas
- Use `space-y-4` (too tight) or `space-y-16` (too loose) between top-level page sections
- Put anything above the page header — header is always the first element inside `<main>`
- Use `variant="destructive"` for archive — archive is reversible; use `variant="outline"`
- Render a detail page without breadcrumbs when the user arrived from a list
- Drop the `text-destructive` on a Danger Zone `CardTitle` — it's the zone's visual signature
