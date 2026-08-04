---
# Machine-readable token manifest. Authoritative source for the design-system linter,
# which reconciles these tokens against the shipped tokens in
# `@upstart13-com/aiden-ui/styles/globals.css` (imported via `src/lib/styles.css`) and
# usages across `docs/design-system/*.md` and `src/`. When this block disagrees with
# prose elsewhere in this file, the YAML wins — update it first.
version: "2"
name: Smithers DS
description: Violet primary on neutral grays, Inter typography, full semantic palette, 4px-grid radii.
figma: https://www.figma.com/design/eHCER1DdlXffFVUlU8L3lc/Alacrity?node-id=1813-1074
colors:
  background: { light: "#FFFFFF", dark: "#111827" }
  foreground: { light: "#111827", dark: "#F7F8FA" }
  card: { light: "#FFFFFF", dark: "#374151" }
  card-foreground: { light: "#111827", dark: "#F7F8FA" }
  popover: { light: "#FFFFFF", dark: "#374151" }
  popover-foreground: { light: "#111827", dark: "#F7F8FA" }
  primary: { light: "#7C3AED", dark: "#8B5CF6" }
  primary-foreground: { light: "#FFFFFF", dark: "#FFFFFF" }
  secondary: { light: "#F7F8FA", dark: "#374151" }
  secondary-foreground: { light: "#111827", dark: "#F7F8FA" }
  muted: { light: "#F7F8FA", dark: "#374151" }
  muted-foreground: { light: "#6B7280", dark: "#D1D5DB" }
  accent: { light: "#5B3DF5", dark: "#8B5CF6" }
  accent-foreground: { light: "#FFFFFF", dark: "#FFFFFF" }
  border: { light: "#E5E7EB", dark: "rgba(255,255,255,0.10)" }
  input: { light: "#E5E7EB", dark: "rgba(255,255,255,0.08)" }
  ring: { light: "#7C3AED", dark: "#A78BFA" }
  success: { light: "#059669", dark: "#10B981" }
  success-soft: { light: "#ECFDF5", dark: "#064E3B" }
  warning: { light: "#D97706", dark: "#F59E0B" }
  warning-soft: { light: "#FEF3C7", dark: "#451A03" }
  destructive: { light: "#DC2626", dark: "#EF4444" }
  destructive-soft: { light: "#FEF2F2", dark: "#450A0A" }
  info: { light: "#2563EB", dark: "#3B82F6" }
  info-soft: { light: "#EFF6FF", dark: "#172554" }
  chart-1: { light: "#7C3AED", dark: "#A78BFA" }
  chart-2: { light: "#A78BFA", dark: "#C4B5FD" }
  chart-3: { light: "#9CA3AF", dark: "#D1D5DB" }
  chart-4: { light: "#E5E7EB", dark: "#6B7280" }
  chart-5: { light: "#10B981", dark: "#34D399" }
  sidebar: { light: "#FAFBFC", dark: "#111827" }
  sidebar-foreground: { light: "#111827", dark: "#F7F8FA" }
  sidebar-primary: { light: "#7C3AED", dark: "#8B5CF6" }
  sidebar-primary-foreground: { light: "#FFFFFF", dark: "#FFFFFF" }
  sidebar-accent: { light: "#EDE9FE", dark: "rgba(139,92,246,0.15)" }
  sidebar-accent-foreground: { light: "#6D28D9", dark: "#C4B5FD" }
  sidebar-border: { light: "#F3F4F6", dark: "rgba(255,255,255,0.08)" }
  sidebar-ring: { light: "#7C3AED", dark: "#A78BFA" }
primary-scale:
  50: "#F5F3FF"
  100: "#EDE9FE"
  200: "#DDD6FE"
  300: "#C4B5FD"
  400: "#A78BFA"
  500: "#8B5CF6"
  600: "#7C3AED"
  700: "#6D28D9"
  800: "#5B21B6"
  900: "#4C1D95"
neutral-scale:
  50: "#FAFBFC"
  100: "#F7F8FA"
  200: "#F3F4F6"
  300: "#E5E7EB"
  400: "#D1D5DB"
  500: "#9CA3AF"
  600: "#6B7280"
  700: "#4B5563"
  800: "#374151"
  900: "#111827"
typography:
  sans: { fontFamily: "Inter", cssVar: "--font-sans" }
  mono: { fontFamily: "JetBrains Mono", cssVar: "--font-mono" }
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  "2xl": "16px"
  full: "9999px"
radius:
  base: "0.25rem" # 4px — drives `rounded` default
container:
  maxWidth: "1280px"
  padding:
    default: "1.5rem"
    sm: "2rem"
    lg: "3rem"
    xl: "4rem"
contrast-pairs:
  # WCAG AA (4.5:1) enforcement set. Run by `ds:lint contrast-ratio`.
  - { fg: foreground, bg: background }
  - { fg: card-foreground, bg: card }
  - { fg: popover-foreground, bg: popover }
  - { fg: primary-foreground, bg: primary }
  - { fg: secondary-foreground, bg: secondary }
  - { fg: muted-foreground, bg: muted }
  - { fg: accent-foreground, bg: accent }
  - { fg: sidebar-foreground, bg: sidebar }
  - { fg: sidebar-primary-foreground, bg: sidebar-primary }
  - { fg: sidebar-accent-foreground, bg: sidebar-accent }
---

# Design System — Foundations

> **Source of truth:** [Figma Smithers DS](https://www.figma.com/design/eHCER1DdlXffFVUlU8L3lc/Alacrity?node-id=1813-1074). Token values below mirror the Figma library 1:1.

## Color Tokens

All colors are referenced by token, never by raw value. The token system supports light and dark mode automatically. Tokens fall into three groups: **semantic** (always use these in app code), **primary scale** (violet ramp, exposed when you need a specific step), and **neutral scale** (gray ramp).

### Semantic Tokens (use these in all UI code)

| Token                                 | Light   | Dark                   | Usage                                         |
| ------------------------------------- | ------- | ---------------------- | --------------------------------------------- |
| `bg-background`                       | #FFFFFF | #111827                | Page background                               |
| `text-foreground`                     | #111827 | #F7F8FA                | Primary text                                  |
| `bg-card`                             | #FFFFFF | #374151                | Card/surface background                       |
| `text-card-foreground`                | #111827 | #F7F8FA                | Text on cards                                 |
| `bg-muted`                            | #F7F8FA | #374151                | Subtle backgrounds, table headers             |
| `text-muted-foreground`               | #6B7280 | #D1D5DB                | Secondary/supporting text                     |
| `bg-primary`                          | #7C3AED | #8B5CF6                | Primary button bg, brand-violet surfaces      |
| `text-primary-foreground`             | #FFFFFF | #FFFFFF                | Text on primary button                        |
| `bg-secondary`                        | #F7F8FA | #374151                | Secondary button bg                           |
| `text-secondary-foreground`           | #111827 | #F7F8FA                | Text on secondary button                      |
| `bg-accent`                           | #5B3DF5 | #8B5CF6                | Saturated brand violet (CTAs, focus emphasis) |
| `text-accent`                         | #5B3DF5 | #8B5CF6                | Brand-violet text emphasis                    |
| `text-accent-foreground`              | #FFFFFF | #FFFFFF                | Text on `bg-accent`                           |
| `border-border`                       | #E5E7EB | rgba(255,255,255,0.10) | Borders, dividers                             |
| `bg-destructive` / `text-destructive` | #DC2626 | #EF4444                | Error/destructive actions                     |
| `ring-ring`                           | #7C3AED | #A78BFA                | Focus ring                                    |

### Semantic Status Tokens

For badges, alerts, and status messaging. Each comes in a saturated `--<name>` (solid bg + white text) and a `--<name>-soft` (tinted bg + saturated text).

| Token                 | Light bg / fg         | Dark bg / fg          |
| --------------------- | --------------------- | --------------------- |
| `success` (solid)     | `#059669` / `#FFFFFF` | `#10B981` / `#FFFFFF` |
| `success-soft`        | `#ECFDF5` / `#059669` | `#064E3B` / `#34D399` |
| `warning` (solid)     | `#D97706` / `#FFFFFF` | `#F59E0B` / `#111827` |
| `warning-soft`        | `#FEF3C7` / `#D97706` | `#451A03` / `#FBBF24` |
| `destructive` (solid) | `#DC2626` / `#FFFFFF` | `#EF4444` / `#FFFFFF` |
| `destructive-soft`    | `#FEF2F2` / `#DC2626` | `#450A0A` / `#F87171` |
| `info` (solid)        | `#2563EB` / `#FFFFFF` | `#3B82F6` / `#FFFFFF` |
| `info-soft`           | `#EFF6FF` / `#2563EB` | `#172554` / `#60A5FA` |

Apply via the semantic Badge variants — see `02-components.md`.

### Primary Scale (violet)

Step values exposed as `--primary-{50..900}`. Default `--primary` is step 600 in light mode, step 500 in dark mode. The brand violet `#5B3DF5` (`--brand`) is also exposed for active-state emphasis.

| Step | Hex       | Step | Hex       |
| ---- | --------- | ---- | --------- |
| 50   | `#F5F3FF` | 500  | `#8B5CF6` |
| 100  | `#EDE9FE` | 600  | `#7C3AED` |
| 200  | `#DDD6FE` | 700  | `#6D28D9` |
| 300  | `#C4B5FD` | 800  | `#5B21B6` |
| 400  | `#A78BFA` | 900  | `#4C1D95` |

### Neutral Scale (grays)

Step values exposed as `--neutral-{50..900}`. Used to derive `--background`, `--foreground`, `--card`, `--muted`, `--border`, `--input`.

| Step | Hex       | Step | Hex       |
| ---- | --------- | ---- | --------- |
| 50   | `#FAFBFC` | 500  | `#9CA3AF` |
| 100  | `#F7F8FA` | 600  | `#6B7280` |
| 200  | `#F3F4F6` | 700  | `#4B5563` |
| 300  | `#E5E7EB` | 800  | `#374151` |
| 400  | `#D1D5DB` | 900  | `#111827` |

### Brand Violet

The saturated brand violet `#5B3DF5` (mapped to `--accent` in light, `--primary-500` in dark) is the single brand-emphasis color. Use it for:

- Primary CTA buttons (`Generate Test Plan`, `Approve`, `Continue`)
- Active navigation items / selected states
- Brand emphasis text (`text-accent`)
- Active tab underlines, progress indicators

**Do not use it for:** decorative backgrounds, illustration, body copy, or more than one element per visible screen section.

### Chart Colors

| Token                         | Usage                            |
| ----------------------------- | -------------------------------- |
| `text-chart-1` / `bg-chart-1` | Primary data series (violet 600) |
| `text-chart-2` / `bg-chart-2` | Secondary series (violet 400)    |
| `text-chart-3` / `bg-chart-3` | Tertiary series (neutral 500)    |
| `text-chart-4` / `bg-chart-4` | Quaternary (neutral 300)         |
| `text-chart-5` / `bg-chart-5` | Positive/success (#10B981)       |

---

## Typography

Sans: **Inter** (loaded via `next/font/google` as `--font-sans`). Mono: **JetBrains Mono** (`--font-mono`).

### Type Scale (matches Figma Smithers DS)

| Name       | Class                                           | Size     | Weight | Line Height | Usage                       |
| ---------- | ----------------------------------------------- | -------- | ------ | ----------- | --------------------------- |
| H1         | `text-5xl font-bold tracking-tight`             | 3rem     | 700    | 1.20        | Display / hero headers      |
| H2         | `text-4xl font-bold tracking-tight`             | 2.25rem  | 700    | 1.25        | Page titles                 |
| H3         | `text-3xl font-semibold`                        | 1.875rem | 600    | 1.30        | Major section headings      |
| H4         | `text-2xl font-semibold`                        | 1.5rem   | 600    | 1.35        | Sub-section headings        |
| H5         | `text-xl font-semibold`                         | 1.25rem  | 600    | 1.40        | Card titles                 |
| H6         | `text-lg font-semibold`                         | 1.125rem | 600    | 1.45        | Label headings              |
| Body Large | `text-lg`                                       | 1.125rem | 400    | 1.625       | Hero body text              |
| Body       | `text-base`                                     | 1rem     | 400    | 1.50        | Primary body                |
| Body Small | `text-sm`                                       | 0.875rem | 400    | 1.50        | Secondary body, table cells |
| Label      | `text-xs font-medium tracking-widest uppercase` | 0.75rem  | 500    | 1.40        | Section labels              |
| Mono       | `font-mono text-sm`                             | 0.875rem | 400    | 1.50        | Code, IDs, technical values |

### Typography Rules

- **Page title**: `text-4xl font-bold tracking-tight` — one per page
- **Section label** (above content groups): `text-xs font-medium tracking-widest uppercase text-muted-foreground`
- **Body text**: `text-sm text-foreground` for primary, `text-sm text-muted-foreground` for supporting
- **Numbers/metrics**: `text-3xl font-bold tabular-nums` — always `tabular-nums` for numeric data
- **Code/IDs**: `font-mono text-sm bg-muted px-1.5 py-0.5 rounded-sm`

---

## Container

Use the `container` class for all page-width wrappers. Configured in `@upstart13-com/aiden-ui/styles/globals.css` (imported via `src/lib/styles.css`) as un-layered CSS (not `@utility`) so it correctly applies centering and padding.

```tsx
<section className="border-border border-b">
  <div className="container py-24">{/* content */}</div>
</section>
```

| Breakpoint       | Padding (each side) |
| ---------------- | ------------------- |
| Default (mobile) | `1.5rem` (24px)     |
| `sm` ≥ 640px     | `2rem` (32px)       |
| `lg` ≥ 1024px    | `3rem` (48px)       |
| `xl` ≥ 1280px    | `4rem` (64px)       |

Max-width: `1280px`. Always `margin: auto` centered.

> **Tailwind v4 gotcha:** `@utility container { margin-inline: auto }` does NOT reliably apply margin or padding — only `max-width` gets honoured. The fix is plain un-layered CSS (`.container { ... }`) in the package's `globals.css`, which wins over all `@layer` declarations. Do not re-configure container via `@utility` alone.

---

## Spacing Scale (4px grid)

The Smithers DS uses a 4px grid. Common patterns:

| Context           | Classes                                                      |
| ----------------- | ------------------------------------------------------------ |
| Page padding      | `px-6 py-8` (md: `px-8 py-10`)                               |
| Card padding      | `p-5` or `p-6`                                               |
| Section gap       | `space-y-8` or `gap-8`                                       |
| Related items gap | `space-y-4` or `gap-4`                                       |
| Tight/inline gap  | `gap-2`                                                      |
| Form field gap    | `space-y-1.5` (label to input), `space-y-6` (field to field) |

Spacing tokens map directly to Figma's scale: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96`.

---

## Border Radius

Aligned to the Figma scale. Default `rounded` resolves to `--radius` = `4px`.

| Token          | Value  | Usage                                            |
| -------------- | ------ | ------------------------------------------------ |
| `rounded-sm`   | 4px    | **Default** — buttons, badges, inputs, dropdowns |
| `rounded-md`   | 6px    | Inputs, popovers                                 |
| `rounded-lg`   | 8px    | Larger buttons, emphasis pills                   |
| `rounded-xl`   | 12px   | Cards (matches Figma `Card` default)             |
| `rounded-2xl`  | 16px   | Modals (matches Figma dialog corners)            |
| `rounded-full` | 9999px | Avatars, dot indicators                          |

Avoid `rounded-3xl` and above — outside the Figma system.

---

## Shadows

Shadows are minimal. Dark mode uses borders, not shadows, for elevation.

| Class                  | Usage                                                |
| ---------------------- | ---------------------------------------------------- |
| `shadow-sm`            | Subtle card lift (light mode only)                   |
| `shadow`               | Popover, dropdown (light mode only)                  |
| `border border-border` | **Preferred** elevation method — works in both modes |

---

## Icons

Use `lucide-react` exclusively. Import by name: `import { ArrowRight, ChevronDown } from "lucide-react"`.

- Default size: `size-4` (16px) inline with text
- Standalone/large: `size-5` (20px)
- Never use `size-6+` inline with text labels
- Always pair with a text label in navigation and buttons (exception: icon-only buttons must have `aria-label`)
- Use `strokeWidth={1.5}` for a refined look in product UI

```tsx
import { ArrowRight } from "lucide-react";
<ArrowRight className="size-4" strokeWidth={1.5} />;
```

> Exception: when implementing a Figma design, use the assets the Figma MCP returns (including SVG payloads). The Lucide-only rule applies to net-new UI work not driven by a Figma spec.
