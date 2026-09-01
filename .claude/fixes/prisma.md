# Prisma Fixes

## 1. Always run `prisma generate` after schema changes

**Error:** `PrismaClientInitializationError` or missing types after modifying `prisma/schema.prisma`.

**Cause:** The Prisma client is code-generated from the schema. Schema changes are not reflected until regeneration.

**Fix:** Run `DATABASE_URL=... npx prisma generate` (or `npm run postinstall`) after any schema change. The `postinstall` script handles this automatically on `npm install`.

**Structurally prevented:** No — requires manual step after schema edits.

---

## 2. Prisma v7 requires `prisma.config.ts` for datasource URL

**Error:** `The datasource property 'url' is no longer supported in schema files.`

**Cause:** Prisma v7 moved datasource configuration out of `schema.prisma` into `prisma.config.ts`.

**Fix:** Keep `datasource db { provider = "postgresql" }` in schema (no `url`). The URL is configured in `prisma.config.ts` via `defineConfig({ datasource: { url: env("DATABASE_URL") } })`. The `PrismaClient` is instantiated with `@prisma/adapter-pg` in `src/lib/prisma.ts`.

**Structurally prevented:** No — but documented in schema and config files.

---

## 3. `prisma.config.ts` must load `.env.local` explicitly

**Error:** `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL.`

**Cause:** `import "dotenv/config"` only loads `.env` by default. Next.js uses `.env.local` for local overrides, but Prisma CLI runs outside of Next.js and doesn't know about `.env.local`.

**Fix:** Replace `import "dotenv/config"` with explicit path loading:

```typescript
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
```

**Structurally prevented:** Yes — `prisma.config.ts` already updated with the correct pattern.

---

## [2026-09-01] `prisma db seed` cannot find a seed command, and `migrate reset` never seeds at all

**Symptom:** `npm run db:seed` failed with "No seed command found" while `package.json` plainly contained `"prisma": { "seed": "npx tsx prisma/seed.ts" }`.

**Root cause:** Prisma 7 stopped reading the `prisma.seed` key from `package.json`. The only location it honours is `migrations.seed` in `prisma.config.ts` (`MigrationsConfigShape` in `@prisma/config`: `path?`, `initShadowDb?`, `seed?`). The legacy key is not warned about — it is simply ignored, so the config looks correct and does nothing.

**Fix:**

```typescript
export default defineConfig({
  migrations: { path: "prisma/migrations", seed: "npx tsx prisma/seed.ts" },
});
```

The dead `prisma` block was deleted from `package.json` in the same change. Leaving it is worse than useless: the next person edits it and cannot understand why nothing changes.

**No `--env-file` in the seed command.** `prisma.config.ts` already calls `dotenv.config({ path: ".env.local" })`, which mutates `process.env`, and the seed is a child process that inherits it. Adding `--env-file=.env.local` would make the command *fail* anywhere that file is absent — CI, a fresh clone — because Node errors on a missing `--env-file` instead of skipping it. Verified: `npm run db:seed` works with the flag absent.

**`prisma migrate reset` does not run the seed, and this is the part worth knowing.** Prisma 7 dropped seed-on-reset entirely. Measured against a throwaway database: reset applied all three migrations, printed no seed line, and left every table at zero rows — with `migrations.seed` correctly set. The tell is that `--skip-seed` no longer appears in `migrate reset --help` or `migrate dev --help`; a flag that turns a behaviour off is absent because the behaviour is. After any reset, run `npm run db:seed` yourself.

**How this was nearly documented wrong:** the first version of this fix asserted, in the README and in a config comment, that setting `migrations.seed` also repaired `migrate reset`. That was inference from how Prisma 6 behaved, not measurement, and it was false. It was caught only because the claim was tested before being believed — on a scratch database created for the purpose, so the developer database was never at risk. **A fix is not finished when the command you cared about starts working; it is finished when every claim you wrote down about it has been run.**

**Structurally prevented:** Partly. `prisma db seed` now works and the misleading legacy key is gone, so the original failure cannot recur. Nothing enforces re-seeding after a reset — that stays a documented step.
