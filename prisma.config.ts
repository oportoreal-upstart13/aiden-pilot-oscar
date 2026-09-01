import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: ".env.local" });

// Placeholder lets `prisma generate` (postinstall) run before the customer
// sets DATABASE_URL. Migrate / runtime queries still fail loudly without it.
const url =
  process.env.DATABASE_URL ?? "postgresql://placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    /**
     * Prisma 7 no longer reads the `prisma.seed` key from `package.json`;
     * `migrations.seed` here is the only location it honours. Without it,
     * `prisma db seed` exits with "No seed command found" even though the
     * legacy key is sitting right there in `package.json`.
     *
     * This does **not** make `prisma migrate reset` seed. Measured against a
     * throwaway database on 2026-09-01: reset applied all three migrations
     * and left every table at zero rows, with no seed line in its output.
     * Prisma 7 dropped seed-on-reset altogether — `--skip-seed` is gone
     * from both `migrate reset --help` and `migrate dev --help`, which is
     * the giveaway. After any reset, run `npm run db:seed` yourself.
     *
     * No `--env-file` on purpose. The `dotenv.config()` call above mutates
     * `process.env`, and the seed runs as a child process that inherits it,
     * so the variables are already there. Passing `--env-file=.env.local`
     * would instead make the command *fail* wherever that file does not
     * exist — CI, or a fresh clone — because Node errors on a missing
     * `--env-file` rather than skipping it.
     */
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: { url },
});
