# DeskLine

A multi-tenant AI support desk, built on the AIDEN SDK. Agents triage and
resolve customer tickets per organization, with automatic ticket
classification and AI-drafted replies that stream token by token.

**Stack:** Next.js 16 (App Router) · TypeScript 5 · NextAuth v5 · Prisma 7 +
PostgreSQL · `@upstart13-com/aiden-*` · shadcn/ui via `aiden-ui` · Tailwind v4.

> **Always use the scoped CLI: `npx @upstart13-com/aiden-cli`.** The unscoped
> `npx aiden` resolves to `aiden@0.0.3`, an unrelated third-party package that
> npm will download and execute. See `.claude/fixes/aiden-cli.md`.

---

## From a clean clone

### 1. Authenticate to GitHub Packages

The `@upstart13-com/*` packages are private. Without this, `npm install` fails.

```bash
cp .npmrc.example .npmrc
export GITHUB_PAT=ghp_xxxxxxxx     # classic PAT, scope: read:packages,
                                   # SSO-authorised for the Upstart13-com org
```

`.npmrc` is gitignored. Never commit the token.

### 2. Install

```bash
npm install
```

### 3. Postgres

Any Postgres 16+ will do. With Docker:

```bash
docker run -d --name deskline-pg -p 5433:5432 \
  -e POSTGRES_USER=deskline -e POSTGRES_PASSWORD=deskline \
  -e POSTGRES_DB=deskline_dev postgres:17
```

### 4. Environment

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | e.g. `postgresql://deskline:deskline@localhost:5433/deskline_dev` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `http://localhost:3000` for dev; must match the port you serve on |
| `AUTH_TRUST_HOST` | `true` locally |
| `ANTHROPIC_API_KEY` | starts `sk-ant-`. The live provider |
| `GROQ_API_KEY` | starts **`gsk_`**, from console.groq.com. Enabled to demonstrate the provider switch |

> `gsk_` is Groq. A key starting `xai-` is **xAI**, a different company whose
> models are called Grok. `aiden doctor` cannot tell them apart — it checks that
> a variable is present, not that it is valid or that it belongs to the provider
> you declared. A green doctor is not a working integration.

### 5. Schema, migrations, seed

```bash
npm run prisma:merge     # compose prisma/fragments/*.prisma -> prisma/schema.prisma
npx prisma validate      # catches relation and syntax errors without touching the DB
npm run db:migrate       # create + apply migrations
npx prisma generate      # migrate dev does not always regenerate; do it explicitly
npm run db:seed          # idempotent — safe to re-run
```

The seed command lives in `migrations.seed` in `prisma.config.ts`. Prisma 7
stopped reading the `prisma.seed` field in `package.json`, so a project that
only sets the old key gets "No seed command found" from `prisma db seed`.

**`prisma migrate reset` does not seed.** Prisma 7 removed seed-on-reset — the
`--skip-seed` flag is gone from both `migrate reset` and `migrate dev`. Reset
applies the migrations and leaves every table empty regardless of
`migrations.seed`, so run `npm run db:seed` afterwards.

Never hand-edit `prisma/schema.prisma` — it is generated. Add a fragment under
`prisma/fragments/` and re-run the merge.

### 6. Check and run

```bash
npx @upstart13-com/aiden-cli doctor
npm run dev
```

Doctor should report the config valid and all 4 required variables present.
The CVE scan needs `osv-scanner` on PATH (`winget install Google.OSVScanner` on
Windows, `brew install osv-scanner` on macOS).

Open <http://localhost:3000> and sign in as any seeded persona.

---

## Seeded personas

Every one shares the password **`DeskLine!Seed1`**.

| Email | Name | Acme Corp | Globex Inc |
|-------|------|-----------|------------|
| `owner@acme.test` | Ada Okafor | owner | — |
| `agent1@acme.test` | Ben Silva | agent | — |
| `agent2@acme.test` | Chen Wu | agent | — |
| `viewer@acme.test` | Dana Reyes | viewer | — |
| `owner@globex.test` | Eli Novak | — | owner |
| `agent1@globex.test` | Farah Haddad | — | agent |
| `agent2@globex.test` | Gil Moreau | — | agent |
| `viewer@globex.test` | Hana Kimura | — | viewer |
| `consultant@deskline.test` | Iris Vance | **agent** | **viewer** |

Iris belongs to both organizations with a different role in each — she is what
makes the multi-tenant behaviour observable rather than theoretical.

What each role may do:

- **owner** — reads every ticket in the organization, manages members, reads
  the audit trail and AI spend. Does **not** mutate tickets.
- **agent** — reads and mutates the tickets they own, creates tickets, and uses
  the AI actions.
- **viewer** — reads every ticket in the organization. Every mutation and every
  AI action is refused server-side with a 403.

Twelve seeded tickets, `tkt_acme_1…6` and `tkt_globex_1…6`. `tkt_acme_6` is a
prompt-injection fixture — its body tries to talk the model out of its
instructions, and it is the subject of the adversarial probe in
`docs/evidence/`.

---

## Switching the AI provider

One line in `aiden.config.ts`:

```ts
defaultProvider: "anthropic",   // or "groq", "openai", "google", "mistral", "cohere"
```

Enable the provider in the same file (`ai.providers.<name>: true`), pin its
model in `ai.models`, and put its key in `.env.local`. Rebuild.

No route changes. Every call site goes through `getAI()` in `src/lib/ai.ts`,
which resolves the client from `defaultProvider`; nothing downstream names a
provider. Verified with both providers on both AI paths in
`docs/evidence/provider-switch-2026-08-22.txt`.

Worth knowing before you switch: the three providers do structured output three
different ways — Anthropic never receives the JSON schema at all, OpenAI
receives it as `json_schema` strict, Groq receives `json_object` JSON mode. Zod
validation in `src/lib/triage.ts` is the only guarantee that holds across all
three. Details in `.claude/fixes/aiden-ai.md`.

---

## Commands

```bash
npm run dev              # dev server
npm run build            # merge fragments + generate client + build
npm start                # serve the production build
npm run lint             # ESLint, including the design-system colour rule
npm run typecheck        # tsc --noEmit
npm test                 # unit + route-handler tests (Node's runner, no framework installed)
npm run smoke            # the ten graded probes — needs a running server
npm run db:studio        # Prisma Studio (Prisma 7 picks a random port; read the output)
npx @upstart13-com/aiden-cli doctor
npx @upstart13-com/aiden-cli upgrade
```

`npm run smoke` expects a production build on `http://localhost:3100`; override
with `SMOKE_BASE`.

`aiden upgrade` **does not work on Windows** — it spawns `npm` without
`shell: true`, which Node blocks for `.cmd` files, and then reports a registry
error. Run it from WSL or a Unix runner. Do not hand-bump the
`@upstart13-com` versions in `package.json`: the upgrade also runs codemods and
migrations, and hand-editing skips both. Root cause and reproduction in
`docs/ops-diagnosis.md`.

---

## Where things live

| Concern | Where |
|---------|-------|
| Active organization resolution | `src/lib/org.ts` — the cookie is untrusted; `Membership` is the authority |
| Tenant scoping + ownership | `src/lib/tickets.ts` |
| Ability rules | `src/lib/abilities.ts` — org rules are predicates over the active membership, never the `{ roles }` shorthand |
| Route adapters, params validation | `src/lib/routes.ts` |
| Request schemas | `src/lib/validations/*.ts` — pure Zod, safe to import from a client form |
| AI prompts and fencing | `src/lib/ai-prompts.ts` |
| Triage | `src/lib/triage.ts` |
| AI usage sink and correlation | `src/lib/ai-usage.ts` |
| Audit sink and the org-scoped reader | `src/lib/audit.ts` |
| Schema fragments | `prisma/fragments/*.prisma` |

Docs: the implementation plan is `docs/plans/deskline.md`, operational
diagnosis is `docs/ops-diagnosis.md`, the demo script is
`docs/demo-walkthrough.md`, and every claim either of them makes is backed by a
capture in `docs/evidence/`.

---

## Before opening a PR

```bash
npm run typecheck && npm run lint && npm run build
npm test
npm run smoke            # with a production build running
```

Then `/security-review`. It is enforced by `/ship`.
