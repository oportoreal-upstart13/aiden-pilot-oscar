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
