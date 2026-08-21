# CLAUDE.md

Customer app cloned from the AIDEN starter template. The Upstart13 AI Foundation (AIDEN) ships auth, database, security, logging, AI, and UI as versioned `@upstart13-com/aiden-*` packages — your job is to build features on top of them, not reimplement them.

**Stack:** Next.js 16 (App Router) · TypeScript 5 · NextAuth v5 · Prisma 7 + PostgreSQL · `@upstart13-com/aiden-*` packages · shadcn/ui · Tailwind CSS v4 · react-hook-form · Zod

## Commands

```bash
# ─── App ─────────────────────────────────────────
npm install              # Install all deps
npm run dev              # Next.js dev server
npm run build            # Production build (composes prisma fragments + generates client + builds)
npm run lint             # Lint with ESLint
npx prettier --write .   # Format
npx tsc --noEmit         # Type-check

# ─── Database (Prisma 7) ────────────────────────
npm run prisma:merge     # Compose prisma/fragments/*.prisma → prisma/schema.prisma
npm run prisma:generate  # Merge + prisma generate
npm run db:migrate       # Merge + prisma migrate dev
npm run db:push          # Merge + prisma db push (no migrations)
npm run db:studio        # Open Prisma Studio

# ─── AIDEN CLI ───────────────────────────────────
npx aiden doctor          # Verify env vars, run osv-scanner, validate aiden.config.ts
npx aiden upgrade         # Upgrade @upstart13-com/aiden-* packages, run codemods, apply migrations

# ─── Security ───────────────────────────────────
npm audit
osv-scanner --lockfile package-lock.json
```

## Verification

After making changes, verify your work:

- `npm run lint` after code changes
- `npx tsc --noEmit` to confirm no type errors
- For API routes: `curl` the dev server to confirm response shape
- For UI changes: open the page in a browser and compare against intended design
- `npm run build` only when explicitly requested or before a release

---

## Where each concern lives

You should rarely touch `src/lib/*.ts` files except to extend them. The heavy lifting lives in `@upstart13-com/aiden-*`.

| Task                              | Use this                                                                                      | Wired in                              |
| --------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------- |
| Add an API route                  | `withAuth(handler)` from `@upstart13-com/aiden-security`                                      | `src/app/api/.../route.ts`            |
| Validate request body             | `parseRequest(req, zodSchema)` from `@upstart13-com/aiden-security`                           | inside the handler                    |
| Prevent IDOR on user-owned data   | `assertOwnership(row, userId)` from `@upstart13-com/aiden-security`                           | after every fetch                     |
| Get the session                   | `auth()` from `src/lib/auth.ts` (re-exports from `@upstart13-com/aiden-auth`)                 | server components, route handlers     |
| Database access                   | `prisma` from `src/lib/prisma.ts`                                                             | server-side only                      |
| Add a Prisma model                | new fragment under `prisma/fragments/<feature>.prisma`, then `npm run prisma:merge`           |                                       |
| Log something                     | `log.info(...)` from `src/lib/logger.ts` — `requestId`/`userId` auto-attach inside `withAuth` |                                       |
| Call an AI provider               | `createAIClient({ provider, model })` from `@upstart13-com/aiden-ai`                          | wrap in `src/lib/ai.ts`               |
| UI primitives (Button, Card, etc) | `@upstart13-com/aiden-ui` (re-exports themed shadcn)                                          | import directly                       |
| Auth UI                           | `LoginForm` / `RegisterForm` from `@upstart13-com/aiden-auth/components`                      | `src/app/login/`, `src/app/register/` |
| Page layout primitives            | `PageHeader`, `SiteHeader`, `DashboardNav` from `@upstart13-com/aiden-ui`                     | layouts + page headers                |

**Use the `@upstart13-com/aiden-*` packages for these concerns — improve them, don't replace them.** If you find yourself reimplementing one of the above, or reaching for a third-party library to cover auth, security, database, logging, AI, or UI — stop, check the package README, and use the package primitive instead. The `src/lib/*.ts` files are thin wiring shims around the packages (e.g. `src/lib/security.ts` re-exports `@upstart13-com/aiden-security`); extend them, never fork a package's behavior into your app. If a primitive is missing or insufficient, it belongs in the SDK — raise it upstream so the fix ships to every app via `npx aiden upgrade`, rather than building a local or external replacement that drifts from the SDK and breaks on upgrade. (Third-party libraries for genuinely app-specific features the SDK doesn't cover are of course fine.)

---

## IMPORTANT: UI / Frontend Rules

**YOU MUST do ALL THREE of the following before writing ANY UI code — no exceptions:**

1. **Invoke the `frontend-design` skill** — `/frontend-design` with a description of what to build
2. **Read `docs/design-system/00-overview.md`** — always, for every UI task
3. **Read the relevant design system file(s) for the specific component type** (see Pre-Flight table)

This applies to: new pages, component modifications (even small ones), layout changes, forms, modals, cards, tables, icons, navigation — any React/JSX/TSX that renders visible UI.

### Design System Quick Reference

| File                                    | Read when building                                   |
| --------------------------------------- | ---------------------------------------------------- |
| `docs/design-system/00-overview.md`     | **Always** — philosophy, golden rules, anti-patterns |
| `docs/design-system/01-foundations.md`  | Colors, typography, spacing, icons                   |
| `docs/design-system/02-components.md`   | Buttons, cards, badges, dropdowns, tabs              |
| `docs/design-system/03-forms.md`        | Any form, input, select, checkbox, radio             |
| `docs/design-system/04-dialogs.md`      | Any dialog, modal, confirmation, sheet               |
| `docs/design-system/05-data-display.md` | Tables, metric cards, empty states, code blocks      |
| `docs/design-system/06-navigation.md`   | Sidebar, nav items, page headers, breadcrumbs        |
| `docs/design-system/07-feedback.md`     | Loading states, toasts, error states, progress       |
| `docs/design-system/08-page-layouts.md` | New pages, auth pages, settings, detail views        |

### Source of Truth

The canonical design library is **Smithers DS** in Figma — every token, component, and page pattern derives from it 1:1. The implementation is shipped as `@upstart13-com/aiden-ui`. Tokens are loaded from `src/lib/styles.css` which imports `@upstart13-com/aiden-ui/styles/globals.css`.

> **Figma:** [Alacrity / Smithers DS](https://www.figma.com/design/eHCER1DdlXffFVUlU8L3lc/Alacrity?node-id=1813-1074)

Stack: **Inter** (sans) + **JetBrains Mono** (mono). Violet primary (`#7C3AED`) on neutral grays. Full semantic palette (`success`, `warning`, `destructive`, `info`).

### Non-Negotiable UI Rules (the short list — full rules in design system)

- **NEVER hardcode colors.** Always use CSS variable tokens: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `bg-accent`, `text-accent`, `border-border`, etc.
- **Default radius is `rounded-sm` (4px).** Use `rounded-md` (6px) for inputs, `rounded-lg` (8px) for buttons/badges, `rounded-xl` (12px) for cards, `rounded-2xl` (16px) for modals, `rounded-full` only for avatars and dot indicators. Never go above `rounded-2xl`.
- **NEVER use `bg-gray-*`, `text-zinc-*`, `border-slate-*`** — use semantic tokens only.
- **`@upstart13-com/aiden-ui` first.** Use its primitives before reaching for raw shadcn or building custom. If you need a shadcn primitive that isn't re-exported, install it with `npx shadcn@latest add <component>` and theme it with our tokens.
- **One primary CTA per page section.** Everything else is `secondary` or `ghost`.
- **Tailwind CSS utility classes only** — no custom CSS unless absolutely necessary.
- **Responsive design**: mobile, tablet, and desktop.
- **Every page has a page header** — use `PageHeader` from `@upstart13-com/aiden-ui` (renders `border-b border-border px-6 py-5` — title + optional subtitle + optional action).
- **Lucide icons only** — `import { IconName } from "lucide-react"`, always `strokeWidth={1.5}`, default `size-4`.

---

## Code Style

- Double quotes, not single quotes
- Named exports only — NEVER use default exports (App Router file conventions like `page.tsx`, `layout.tsx`, `route.ts` are exempt)
- Use `type` imports for type-only imports (`import type { Foo } from "..."`)
- Files: `kebab-case.ts` — Next.js routes follow App Router conventions
- Prefix unused params with `_`
- Path alias `@/*` maps to `src/*` — always use it for internal imports
- Server-only modules (`@prisma/client`, anything from `src/lib/prisma.ts`, `src/lib/auth.ts`) **MUST NOT** be imported in `"use client"` files

---

## Security

Every API route under `src/app/api/**/route.ts` MUST follow this pattern:

```ts
import {
  withAuth,
  parseRequest,
  assertOwnership,
} from "@upstart13-com/aiden-security";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  /* ... */
});

export const POST = withAuth(async (req, { session }) => {
  const body = await parseRequest(req, Body);
  const row = await prisma.thing.findUnique({ where: { id: body.id } });
  assertOwnership(row, session.user.id);
  // ... do work ...
  return NextResponse.json({ ok: true });
});
```

Rules:

- Every route MUST call `withAuth` (or `auth()` directly) before any data access — exception: webhooks and explicitly public endpoints
- Every database query on user data MUST scope by `userId` — `assertOwnership` is the IDOR guard
- All request bodies MUST be validated with Zod via `parseRequest` (or `.safeParse()` / `.parse()` directly)
- Never use `$executeRawUnsafe`, `eval()`, `dangerouslySetInnerHTML`, or `new Function()`
- Never import server modules in `"use client"` files — leaks secrets to the browser
- Never hardcode secrets, API keys, or tokens — use environment variables (`aiden doctor` validates these)
- Never log sensitive data (passwords, tokens, full API keys) — `log.info()` is fine for everything else; the request context auto-attaches `requestId`/`userId`
- Run `/security-review` before every PR — enforced via `/ship`
- **Required tool:** `osv-scanner` (`brew install osv-scanner`) — used for live CVE scanning. `aiden doctor` shells out to it.

---

## MCP Servers

### Figma MCP

When implementing designs from the Figma MCP server:

- **Use localhost asset sources directly** — if the Figma MCP returns a `localhost` URL for an image or SVG, use that source as-is in `<img src>` or inline SVG; never replace it with a placeholder
- **Do NOT add icon packages** — all icons and graphic assets are delivered in the Figma payload; do not install or import additional icon libraries (e.g. `react-icons`, `heroicons`) when implementing Figma designs
- **Do NOT use placeholders** — if a localhost asset source is provided, use it; a missing asset is a bug to fix, not a reason to invent a substitute

> **Note on Lucide icons:** The "Lucide icons only" rule applies to net-new UI work not driven by a Figma spec. When implementing a Figma design, use the assets the Figma MCP provides.

---

## IMPORTANT: Library Versions & Documentation Lookup

**Before writing code that uses any external library, YOU MUST use the Context7 MCP to look up the latest documentation.** Do NOT rely on training data for SDK/library APIs — they go stale.

How: Use `resolve-library-id` then `query-docs` to fetch current API signatures and usage patterns.

This applies to: AI/LLM SDKs, Prisma, NextAuth, Stripe, SendGrid, and any third-party package — **except** the `@upstart13-com/aiden-*` packages, where the source of truth is each package's README in `node_modules/@upstart13-com/aiden-*/README.md`.

### Known SDK corrections

| Library      | CORRECT import                                      | WRONG (deprecated)                                               |
| ------------ | --------------------------------------------------- | ---------------------------------------------------------------- |
| Google GenAI | `import { GoogleGenAI, Type } from "@google/genai"` | ~~`import { GoogleGenerativeAI } from "@google/generative-ai"`~~ |

### Version Constraints

| Package | Allowed versions | Rule                                                                                                                                                                      |
| ------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `axios` | `< 1.14.1`       | **NEVER install axios >= 1.14.1.** Pin to `1.14.0` or lower. If `package.json` has a range that could resolve to 1.14.1+, narrow it (e.g. `"axios": ">=1.12.0 <1.14.1"`). |

---

## AIDEN-specific gotchas

- **Schema changes go in fragments**, not in `prisma/schema.prisma` directly. Add a file to `prisma/fragments/<feature>.prisma`, then `npm run prisma:merge`. The composed `schema.prisma` is regenerated and should not be hand-edited.
- **`@upstart13-com/aiden-db` ships `Account`/`Session`/`VerificationToken`** for NextAuth — your `User` model must declare `accounts Account[]` and `sessions Session[]` relations.
- **Generated Prisma client** lives at `src/generated/prisma/` (Prisma 7 consumer-output). Gitignored. Do not edit.
- **Provider SDKs are optional peer deps** of `@upstart13-com/aiden-ai` — install only the ones you use (`npm install openai`, `npm install @anthropic-ai/sdk`, `npm install @google/genai`, etc).
- **`aiden.config.ts` is the feature-flag source.** `aiden doctor` reads it to know which env vars are required; `aiden upgrade` reads it to decide which codemods apply.
- **Upgrading the SDK**: never hand-edit `package.json` to bump `@upstart13-com/aiden-*` versions. Always run `npx aiden upgrade` so codemods + migrations run.

---

## Things to Avoid

- Writing UI code without reading the design system and invoking the `frontend-design` skill
- Hardcoded colors — always use CSS variable tokens
- Border radius beyond `rounded-2xl` (16px) — outside the Smithers DS scale
- Adding features or refactoring beyond what was requested
- Importing Prisma client in browser code — Prisma runs server-side only
- Using deprecated/outdated library imports without checking Context7 first
- Swallowing unexpected errors silently in `catch` blocks — always log via `log.error()` before returning
- Writing UI fetch calls without reading the API route first (mismatched response shapes silently produce empty data — see `.claude/fixes/ui.md`)
- Installing or upgrading `axios` to version 1.14.1 or greater — pin to `< 1.14.1`
- Creating API routes without `withAuth` (or explicit `auth()`) — every route must authenticate
- Database queries without `userId` scoping — IDOR risk; use `assertOwnership`
- Using `$executeRawUnsafe`, `eval()`, `dangerouslySetInnerHTML`
- Importing server-only modules in `"use client"` components
- Hardcoding secrets or API keys — use environment variables
- Hand-editing `prisma/schema.prisma` instead of `prisma/fragments/*.prisma`
- Hand-editing `@upstart13-com/aiden-*` versions in `package.json` — use `npx aiden upgrade`
- Replacing an `@upstart13-com/aiden-*` primitive with a local reimplementation or a third-party library for an SDK concern (auth, security, database, logging, AI, UI) — use/extend the package and raise gaps upstream instead
- Skipping `/security-review` before creating a PR — enforced via `/ship`

---

## Pre-Flight: Required Reading by Task Type

| Task Type               | Must Read Before Starting                                                        |
| ----------------------- | -------------------------------------------------------------------------------- |
| Any UI work             | `docs/design-system/00-overview.md` + relevant DS file(s)                        |
| New page                | `docs/design-system/00-overview.md`, `06-navigation.md`, `08-page-layouts.md`    |
| Form                    | `docs/design-system/03-forms.md`                                                 |
| Dialog/modal            | `docs/design-system/04-dialogs.md`                                               |
| Table / data list       | `docs/design-system/05-data-display.md`                                          |
| Loading/error UI        | `docs/design-system/07-feedback.md`                                              |
| API route work          | Security section above + `.claude/fixes/typescript-build.md`                     |
| Auth changes            | `node_modules/@upstart13-com/aiden-auth/README.md` + Security section above      |
| Database / schema       | `node_modules/@upstart13-com/aiden-db/README.md` + `.claude/fixes/prisma.md`     |
| AI provider integration | `node_modules/@upstart13-com/aiden-ai/README.md` + Context7 for the provider SDK |
| Stripe / SendGrid       | Security section above (Stripe webhooks must verify signatures)                  |
| SDK upgrade             | `npx aiden upgrade` (never hand-edit versions)                                   |
| Any PR creation         | Run `/security-review` (enforced by `/ship`)                                     |

---

## Post-Task Validation

After completing any implementation task:

- Run `npm run lint` — fix all errors before considering a task done
- Run `npx tsc --noEmit` — confirm no type errors
- For API routes, auth, or payment changes: run `/security-review` to check for vulnerabilities

---

## Git Workflow

- Branch names: `feature/description`, `fix/description`, `docs/description`, `refactor/description`
- Conventional commits: `feat(auth): add google oauth`, `fix(stripe): correct webhook handler`
- Do NOT commit: `.env`, `.env.local`, `dist/`, `.next/`, `node_modules/`, `coverage/`, `src/generated/`
- Use `/ship` to commit + push + open a PR — it runs `/security-review` first as a gate
- To upgrade the SDK: `npx aiden upgrade` opens a dedicated PR with all codemod + migration changes; review and merge that PR separately from feature work

---

## Progress Tracking

After completing any task, append a one-line entry to `.claude/progress.log`:

- Format: `[YYYY-MM-DD HH:MM] STATUS type(scope): description — outcome`
- STATUS values: `completed`, `failed`, `blocked`, `discovered`
- This file is append-only. Never edit or truncate existing entries.

---

## Context Management

- Only read design system files relevant to the current task — do not read all 9 files at once
- Only read fix files relevant to the current task type
- For `@upstart13-com/aiden-*` API questions: read the relevant package README in `node_modules/@upstart13-com/aiden-*/`
- When context grows large, summarize findings rather than re-reading source files

---

## Lessons Learned

When you encounter a bug that took multiple attempts to fix, a non-obvious framework gotcha, or a configuration issue, record it in `.claude/fixes/<category>.md`. Create fix files as needed. Update `.claude/fixes/INDEX.md` as the aggregated index.
