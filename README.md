# aiden-pilot-oscar (DeskLine)

DeskLine — a multi-tenant AI support desk workspace, built on the AIDEN Foundation. Next.js 16 (App Router) + TypeScript + NextAuth v5 + Prisma 7/PostgreSQL, with auth, database, security, logging, AI, and UI provided by the `@upstart13-com/aiden-*` packages.

## What's wired

| Concern             | Package                          | File                                                  |
| ------------------- | --------------------------------- | ------------------------------------------------------ |
| Auth                | `@upstart13-com/aiden-auth`      | `src/lib/auth.ts`                                     |
| Database            | `@upstart13-com/aiden-db`        | `src/lib/prisma.ts`                                   |
| Security primitives | `@upstart13-com/aiden-security`  | `src/lib/security.ts`                                 |
| Logging             | `@upstart13-com/aiden-logging`   | `src/lib/logger.ts`                                   |
| AI client           | `@upstart13-com/aiden-ai`        | `src/lib/ai.ts`                                       |
| UI tokens + comps   | `@upstart13-com/aiden-ui`        | `src/lib/styles.css`                                  |
| Feature flags       | —                                  | `aiden.config.ts`                                     |
| Schema fragments    | `@upstart13-com/aiden-db`        | `prisma/fragments/*.prisma` + `aiden-db.config.json` |

## Prerequisites

- Node.js (see `.npmrc.example` / `package.json` engines) and npm
- A PostgreSQL database (local or hosted)
- A GitHub Classic PAT with `read:packages` scope, SSO-authorized for the Upstart13-com org — required to install `@upstart13-com/aiden-*` packages

## Getting started

```bash
# 1. Configure the private registry (one-time)
cp .npmrc.example .npmrc
export GITHUB_PAT=ghp_xxx   # PAT with read:packages, SSO-authorized for Upstart13-com

# 2. Install
npm install

# 3. Set up env
cp .env.example .env.local
# Fill in DATABASE_URL and AUTH_SECRET at minimum.
# Generate AUTH_SECRET:  openssl rand -base64 32

# 4. Generate the Prisma client (composes prisma/fragments + runs prisma generate)
npm run prisma:generate

# 5. Run migrations
npm run db:migrate

# 6. Start the dev server
npm run dev
```

Visit <http://localhost:3000>:

- `/` — landing
- `/login`, `/register` — auth flows powered by `aiden-auth/components`
- `/dashboard` — protected route showing the auth session

## Environment variables

`.env.example` is the source of truth — copy it to `.env.local` and fill in the values you need. At minimum, set `DATABASE_URL` and `AUTH_SECRET`. OAuth and AI provider keys are only needed when you enable the matching provider in `aiden.config.ts`.

```bash
npx aiden doctor
```

validates the env vars you actually need based on `aiden.config.ts`.

## Commands

```bash
npm install              # Install all deps
npm run dev              # Next.js dev server
npm run build            # Production build (composes prisma fragments + generates client + builds)
npm run start            # Start the production build
npm run lint             # Lint with ESLint
npm run typecheck        # Type-check with tsc --noEmit

npm run prisma:merge     # Compose prisma/fragments/*.prisma → prisma/schema.prisma
npm run prisma:generate  # Merge + prisma generate
npm run db:migrate       # Merge + prisma migrate dev
npm run db:push          # Merge + prisma db push (no migrations)
npm run db:seed          # Seed the database (prisma/seed.ts)
npm run db:studio        # Open Prisma Studio

npx aiden doctor          # Verify env vars, run osv-scanner, validate aiden.config.ts
npx aiden upgrade         # Upgrade @upstart13-com/aiden-* packages, run codemods, apply migrations
```

## Schema fragments

`prisma/schema.prisma` is generated — never hand-edit it. Add new models to `prisma/fragments/<feature>.prisma` and rerun `npm run prisma:merge` (also run automatically as part of `dev`, `build`, `db:migrate`, `db:push`, and `prisma:generate`).

## Further reading

- `CLAUDE.md` — conventions, security rules, and where each concern lives in this repo
- `docs/design-system/` — the UI design system (read before any frontend work)
- `node_modules/@upstart13-com/aiden-*/README.md` — API reference for each AIDEN package
