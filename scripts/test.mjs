#!/usr/bin/env node
/**
 * Test runner.
 *
 * Node's built-in runner plus `tsx`, deliberately — no test framework is
 * installed and none can be: there is no `.npmrc` and no `GITHUB_PAT`, so
 * `npm install` cannot resolve the `@upstart13-com/*` packages from
 * GitHub Packages and would risk the working tree for a devDependency.
 *
 * `TSX_TSCONFIG_PATH` points at `tsconfig.test.json`, which maps
 * `server-only` to a stub. That package is not installed — Next aliases
 * it in webpack — so plain Node cannot resolve it, and the mapping lives
 * in the test tsconfig only. Pointing the app's tsconfig at a no-op would
 * silently disable the guard that keeps server modules out of client
 * bundles.
 *
 * Set as an env var here rather than inline in the npm script because npm
 * runs scripts through cmd.exe on Windows, where `VAR=x cmd` is not a
 * thing.
 */
import { spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function collect(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "generated" || entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, found);
    else if (/\.test\.(ts|mts)$/.test(entry)) found.push(full);
  }
  return found;
}

const files = collect("src").sort();
if (files.length === 0) {
  console.error("no test files found under src/");
  process.exit(1);
}

console.log(`running ${files.length} test file(s):`);
for (const file of files) console.log(`  ${file}`);
console.log();

const child = spawn(
  process.execPath,
  ["--import", "tsx", "--test", "--test-reporter=spec", ...files],
  {
    stdio: "inherit",
    env: { ...process.env, TSX_TSCONFIG_PATH: "tsconfig.test.json" },
  }
);
child.on("exit", (code) => process.exit(code ?? 1));
