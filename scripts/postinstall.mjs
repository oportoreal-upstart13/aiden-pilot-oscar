#!/usr/bin/env node
/**
 * Starter postinstall — runs `prisma:generate` in customer apps so the
 * generated client lands without an extra command after `aiden init`.
 *
 * Skips when running inside the AIDEN SDK monorepo (detected by sibling
 * `packages/aiden-db` workspace), because the `aiden-db-merge-schema` bin
 * lives under `dist/` and isn't symlinked until packages are built.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const monorepoMarker = resolve(here, "..", "..", "..", "packages", "aiden-db");

if (existsSync(monorepoMarker)) {
  console.log(
    "[aiden-starter] SDK monorepo detected — skipping prisma:generate postinstall (will run via build)."
  );
  process.exit(0);
}

if (process.env.AIDEN_SKIP_POSTINSTALL === "1") {
  console.log(
    "[aiden-starter] AIDEN_SKIP_POSTINSTALL=1 — skipping prisma:generate postinstall."
  );
  process.exit(0);
}

const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "prisma:generate"],
  { stdio: "inherit" }
);
process.exit(result.status ?? 0);
