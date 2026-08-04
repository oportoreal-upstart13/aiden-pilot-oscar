# Design System — Components

> **Source of truth:** [Figma Smithers DS](https://www.figma.com/design/eHCER1DdlXffFVUlU8L3lc/Alacrity?node-id=1813-1074).

## Buttons

Four base variants × three sizes (SM / MD / LG), plus `ghost` and `outline`. **One primary CTA per view.**

### Primary (Violet)

Default action button. Use for the main action on a page (`Save Changes`, `Generate Test Plan`, `Continue`).

```tsx
<Button>Save Changes</Button>
// Renders: bg-primary text-primary-foreground (violet 600 → white)
```

### Secondary

Lower-weight action alongside a primary.

```tsx
<Button variant="secondary">Cancel</Button>
// Renders: bg-secondary text-secondary-foreground (neutral surface)
```

### Outline

Tertiary, side-by-side with primary, or for filter/category controls.

```tsx
<Button variant="outline">Export</Button>
// Renders: border-border bg-background text-foreground hover:bg-muted
```

### Ghost

Lowest weight. Use for icon buttons, navigation actions, dialog close affordances.

```tsx
<Button variant="ghost">View Details</Button>
```

### Destructive

Only for irreversible destructive actions (delete, revoke). Always paired with a confirmation dialog.

```tsx
<Button variant="destructive">Delete Account</Button>
```

### Size Scale (matches Figma SM / MD / LG)

```tsx
<Button size="sm">SM</Button>     // text-xs, h-8
<Button>MD (default)</Button>     // text-sm, h-9
<Button size="lg">LG</Button>     // text-base, h-11
```

### Button Rules

- One `variant="default"` (primary) per dialog/page section
- Destructive confirm dialogs: red destructive button + ghost cancel
- Loading state: add `disabled` + spinner icon left of label
- Icon + label: `<Button><Plus className="size-4 mr-2" strokeWidth={1.5} />Add Item</Button>`
- Never use `disabled` without a tooltip explaining why

---

## Cards

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@upstart13-com/aiden-ui";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Supporting description text</CardDescription>
  </CardHeader>
  <CardContent>{/* main content */}</CardContent>
  <CardFooter className="flex justify-end gap-2">
    <Button variant="ghost">Cancel</Button>
    <Button>Confirm</Button>
  </CardFooter>
</Card>;
```

### Card Variants (Figma: Default / Elevated / Flat)

**Default** — `bg-card border border-border rounded-xl shadow-sm`. The shadcn default.

**Elevated** — same surface, lifted with `shadow-md`:

```tsx
<Card className="shadow-md">…</Card>
```

**Flat** — flush with page background, no border:

```tsx
<Card className="bg-muted/30 border-0 shadow-none">…</Card>
```

**Stat/metric card:**

```tsx
<Card className="p-5">
  <p className="text-muted-foreground mb-1 text-xs font-medium tracking-widest uppercase">
    Total Users
  </p>
  <p className="text-3xl font-bold tabular-nums">1,284</p>
  <p className="text-success mt-1 text-xs">+12% from last month</p>
</Card>
```

**Inverted/highlight card:**

```tsx
<Card className="bg-foreground text-background border-0 p-6">
  <CardTitle className="text-background">Feature Title</CardTitle>
  <CardDescription className="text-background/60">Description</CardDescription>
</Card>
```

### Card Rules

- Padding: `p-5` or `p-6`. Avoid `p-4` (too tight) or `p-8` (too loose for product cards).
- Border radius: `rounded-xl` (12px) — matches Figma `Card` default.
- Nested cards: not more than one level deep.

---

## Badges

The Smithers DS exposes six semantic variants. All ship as soft pills (tinted bg + saturated text) except `default`/`secondary`/`destructive` which keep solid fills for high-emphasis use.

```tsx
import { Badge } from "@upstart13-com/aiden-ui";

<Badge>default</Badge>            // solid violet (high emphasis)
<Badge variant="secondary">secondary</Badge>
<Badge variant="primary">primary</Badge>   // soft violet
<Badge variant="success">success</Badge>
<Badge variant="warning">warning</Badge>
<Badge variant="error">error</Badge>
<Badge variant="info">info</Badge>
<Badge variant="outline">tag</Badge>
<Badge variant="destructive">destructive</Badge>  // solid red

// Status badges with leading dot:
<Badge variant="success" className="gap-1.5">
  <span className="size-1.5 rounded-full bg-current" />
  Active
</Badge>
```

### Badge Color Semantics

| Variant       | Meaning                          |
| ------------- | -------------------------------- |
| `default`     | High-emphasis brand violet pill  |
| `primary`     | Brand-tagged content (soft)      |
| `secondary`   | Neutral metadata, counts         |
| `outline`     | Category, tag                    |
| `success`     | Success / approved / live        |
| `warning`     | Pending / attention              |
| `error`       | Soft error tag (low emphasis)    |
| `destructive` | Destructive / failed (solid red) |
| `info`        | Informational neutral status     |

### Status Dot Colors (when composing badges with leading dots)

| Status                   | Dot class                 | Meaning              |
| ------------------------ | ------------------------- | -------------------- |
| Active / live / healthy  | `bg-success`              | Green — running      |
| In progress / new        | `bg-primary` or `bg-info` | Violet/blue — active |
| Pending / paused         | `bg-warning`              | Amber — caution      |
| Archived / inactive      | `bg-muted-foreground`     | Muted — not an error |
| Error / failed / blocked | `bg-destructive`          | Red — attention      |

---

## Dropdowns & Menus

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@upstart13-com/aiden-ui";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm">
      Actions <ChevronDown className="ml-1 size-4" strokeWidth={1.5} />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Duplicate</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive focus:text-destructive">
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>;
```

**Rules:**

- `align="end"` for menus triggered from the right edge of a container
- Destructive items: `text-destructive focus:text-destructive`
- Max width: `w-48` or `w-56` — never unbounded
- Add `DropdownMenuLabel` when grouping multiple action types

---

## Separator

```tsx
import { Separator } from "@upstart13-com/aiden-ui";

<Separator />                              // horizontal
<Separator orientation="vertical" />       // vertical
```

Use `Separator` for visual grouping within cards, settings sections, and menus. Do not use raw `<hr>`.

---

## Tooltips

Always provide tooltips for:

- Icon-only buttons
- Disabled interactive elements (explaining why)
- Truncated text

> **Not shipped by `@upstart13-com/aiden-ui`.** Install the shadcn primitive once, then theme it with our tokens:
>
> ```bash
> npx shadcn@latest add tooltip
> ```
>
> This writes `src/components/ui/tooltip.tsx`. Mount `<TooltipProvider>` once at the layout level (e.g. in your root `layout.tsx`), then use `Tooltip` from your local path:

```tsx
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="sm" aria-label="Copy">
      <Copy className="size-4" strokeWidth={1.5} />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Copy to clipboard</TooltipContent>
</Tooltip>;
```

---

## Tabs

```tsx
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@upstart13-com/aiden-ui";

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="overview" className="mt-6">
    {/* content */}
  </TabsContent>
</Tabs>;
```

**Rules:**

- Tabs go immediately under page header, full-width of content area
- Active tab uses violet accent underline
- `mt-6` on `TabsContent` for breathing room
- Max 5 tabs; more → use a sidebar nav or dropdown

---

## Do's and Don'ts

### Do

- One `variant="default"` (primary) per dialog or page section; everything else is `ghost`, `outline`, or `secondary`
- Pair every icon-only button with a `Tooltip` and an `aria-label`
- Use the semantic Badge variants (`success`/`warning`/`error`/`info`) for state — never raw colored text
- Align dropdowns with `align="end"` when triggered from the right edge of a container
- Cap tab count at 5 — switch to sidebar nav or dropdown beyond that
- Use `Separator` for visual grouping, never raw `<hr>`

### Don't

- Stack multiple primary buttons on the same view — hierarchy collapses into noise
- Use `bg-accent` decoratively — accent is reserved for active states and brand emphasis
- Nest cards more than one level deep
- Ship a `disabled` button without a tooltip explaining why
- Use raw colored utilities (`bg-green-500`, `text-red-600`) for status — go through Badge variants
- Use `p-4` on cards (too tight) or `p-8` (too loose) — always `p-5` or `p-6`
