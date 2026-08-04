# Design System — Overview

## Source of Truth

The canonical design system is **"Smithers DS"** in Figma. Tokens, components, and page patterns in this repo derive from that file 1:1.

> **Figma:** [Alacrity / Smithers DS](https://www.figma.com/design/eHCER1DdlXffFVUlU8L3lc/Alacrity?node-id=1813-1074)

If a value here disagrees with Figma, Figma wins — open a PR to align this repo. Do not maintain a local fork of the system.

## Brand Identity

The system is calm, confident, and information-dense. The visual language pairs **violet primary** (`#7C3AED`) on a near-white **neutral** surface with **Inter** typography. It reads as a modern enterprise SaaS: high signal, low ornamentation, generous whitespace, and unambiguous semantic colors for status (success / warning / error / info).

The marketing site borrows this same language but leans on the bracket motif (`[signal]`), monospace flourishes, and large display type. The web app adapts those choices into product UI: still sharp and confident, but built for daily use, scannable lists, and clear actions.

## Design Philosophy

**Signal over noise.** Every element earns its space. If it doesn't help the user understand or act, remove it.

**Typography is the hero.** Strong hierarchy via weight and scale, not color. Inter at three weights (400 / 600 / 700) covers everything.

**Color is functional, not decorative.** Violet primary signals the most important interactive element. Semantic colors signal state. Neutrals do all other work.

**Product-grade, not marketing-grade.** The product borrows brand confidence but optimizes for density and usability over spectacle.

## Golden Rules

1. **NEVER hardcode colors.** Always use CSS variable tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `bg-accent`, `border-border`, etc.). Dark mode is free when you follow this.

2. **Default radius is `rounded-sm` (4px).** Use `rounded-md` (6px) for inputs, `rounded-lg` (8px) for buttons/badges, `rounded-xl` (12px) for cards, `rounded-full` only for avatars and dot indicators.

3. **NEVER use generic Tailwind grays.** No `bg-gray-100`, `text-zinc-500`, `border-slate-200`. Use `bg-muted`, `text-muted-foreground`, `border-border`. Neutral tokens (`--neutral-50`..`--neutral-900`) are exposed as CSS vars when you need a specific step.

4. **Primary action per view = one.** Each page or dialog gets one primary CTA. Everything else is `secondary`, `outline`, or `ghost`.

5. **Section labels are small caps, not large.** Page titles are large. Section labels above content groups are `text-xs font-medium tracking-widest uppercase text-muted-foreground`.

6. **Whitespace is intentional.** 4px grid. Content groups follow the spacing scale (`space-y-3 / 4 / 6 / 8`). Don't compress to fit — paginate or truncate instead.

7. **Interactive elements have three states.** Default, hover (subtle surface shift), focus (visible ring using `--ring`). Never skip focus states — accessibility requirement.

8. **Empty states are complete.** Icon + title + description + action. Never show a blank screen.

9. **Loading states are skeleton-first.** Use `Skeleton` components matching the shape of real content. Reserve full-page spinners for blocking transitions.

10. **Errors are specific.** "Something went wrong" is forbidden. Every error tells the user what happened and what to do next.

## Anti-Patterns — Never Do This

| Bad                                         | Why                                | Good                                |
| ------------------------------------------- | ---------------------------------- | ----------------------------------- |
| `bg-white dark:bg-gray-900`                 | Breaks dark mode                   | `bg-background`                     |
| `text-gray-500`                             | Not in token system                | `text-muted-foreground`             |
| `rounded-2xl` on a button                   | Too soft for brand                 | `rounded-lg` (matches Figma)        |
| Multiple primary buttons on a page          | Dilutes hierarchy                  | One primary, rest secondary/ghost   |
| Gradient backgrounds on product surfaces    | Marketing, not product             | Flat `bg-card` or `bg-muted`        |
| Colored text for emphasis                   | Use `font-semibold` or `font-bold` | Weight, not color                   |
| Inline style `style={{ color: "#7C3AED" }}` | Bypasses theme                     | `text-accent` or `text-primary`     |
| `border-2` for card borders                 | Too heavy                          | `border border-border`              |
| Icons without text labels in primary nav    | Accessibility failure              | Icon + label, or accessible tooltip |
| Disabled buttons with no tooltip            | Invisible UX                       | Tooltip explaining why              |

## Component Library

`@upstart13-com/aiden-ui` is the component library — it re-exports shadcn/ui primitives themed to Smithers DS tokens. **Always import primitives from `@upstart13-com/aiden-ui`** (e.g. `import { Button, Card, Badge } from "@upstart13-com/aiden-ui"`). The `cn` helper comes from there too.

If you need a shadcn primitive that the package does not re-export (e.g. `Select`, `Checkbox`, `RadioGroup`, `Tooltip`, `Alert`, `Progress`), install it locally and theme it with our tokens:

```bash
npx shadcn@latest add <component>
```

This writes the component into `src/components/ui/`. Never build a custom component if a `@upstart13-com/aiden-ui` or shadcn equivalent exists. Extend components via `className` props.

## Typography

Sans: **Inter** (loaded via `next/font/google` in `src/app/layout.tsx` as `--font-sans`).
Mono: **JetBrains Mono** (loaded as `--font-mono`).

Both render with `font-feature-settings` enabled for Inter's stylistic alternates.

## File Structure for UI Code

```
src/
├── app/
│   ├── (auth)/           # Auth pages (login, register)
│   ├── (marketing)/      # Public marketing site
│   ├── dashboard/        # Authenticated app pages (Overview, Chat, Settings)
│   ├── admin/            # Admin-only pages (Users, Audit) — RBAC-gated
│   └── api/              # API routes
├── components/
│   ├── admin/            # Admin-feature components
│   ├── settings/         # Settings-feature components
│   └── ui/               # Locally-installed shadcn primitives (created by `npx shadcn add`)
├── config/               # nav.ts, brand.ts, rbac.ts — app config source of truth
└── lib/
    ├── styles.css        # imports @upstart13-com/aiden-ui tokens; add new @theme tokens here
    └── *.ts              # auth, prisma, ai, security, logger, abilities, audit wiring
```

> Layout primitives (`PageHeader`, `DashboardNav`, `DashboardHeader`, `MobileNav`, `SiteHeader`, `SiteFooter`) and `cn` are package-owned — import them from `@upstart13-com/aiden-ui`, not from a local `components/layout/` or `lib/utils.ts` (neither exists in the starter).

## Hand-off Workflow (Figma → Code)

1. Designer publishes the change in the Smithers DS Figma file.
2. Engineer opens the relevant frame in Figma and uses the **Figma MCP** to fetch design context: `mcp__figma__get_design_context`, `get_screenshot`, `get_metadata`, `get_variable_defs`.
3. Translate visual properties to existing tokens (`bg-primary`, `text-accent`, `rounded-lg`, etc.). Do **not** hand-pick hex values.
4. If Figma introduces a new token, add it to `src/lib/styles.css` (which imports `@upstart13-com/aiden-ui/styles/globals.css`) first, then use it in components — never the reverse.
5. Pre-PR: run `/security-review` (mandatory via `/ship`) and visually verify both light and dark modes for every changed surface.
