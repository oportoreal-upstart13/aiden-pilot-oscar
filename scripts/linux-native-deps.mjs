#!/usr/bin/env node
/**
 * Print the Linux x64 native binaries that `package-lock.json` is missing,
 * at the exact versions the lockfile already pins for Windows.
 *
 * Why this exists
 * ---------------
 * package-lock.json was generated on Windows and records only the
 * `win32-x64` variant of every multi-platform family it contains, even
 * though each declares 8-20 variants. On Linux this makes the lockfile
 * uninstallable in a way that does not announce itself: those binaries are
 * *optional* dependencies, so `npm ci` skips the missing ones, **exits 0**,
 * and hands the next step a tree with no native CSS transformer. The build
 * then dies on `Cannot find module '../lightningcss.linux-x64-gnu.node'`.
 * A green install is not a complete install.
 *
 * `npm install` does not rescue it either — with a lockfile present npm
 * prefers it and does not re-resolve optional dependencies, so the Linux
 * variants are still never fetched. Measured, after trying it in CI.
 *
 * Why not just regenerate the lockfile
 * ------------------------------------
 * Because that is a different change wearing this one's clothes. A
 * from-scratch regeneration does produce a portable lockfile — 89 platform
 * binaries instead of 6 — but it also moves 78 package versions, including
 * next 16.3.1 -> 16.3.4, prisma 7.9.1 -> 7.10.0 and an ajv 8 -> 6
 * downgrade, because package.json uses caret ranges and the registry has
 * moved on. That is a dependency refresh: it deserves its own review and
 * its own test run, not a silent ride along with a CI pipeline.
 *
 * This script is the narrow alternative. It reads the versions the lockfile
 * *already* pins and asks for their Linux counterparts, so the installed
 * tree matches the lockfile rather than drifting from it. Deriving the
 * versions instead of hardcoding them is the point — a hardcoded list goes
 * stale the first time a dependency is bumped, and would go stale silently.
 *
 * Usage:  npm install --no-save $(node scripts/linux-native-deps.mjs)
 */

import { readFileSync } from "node:fs";

/** win32 package name -> its linux-x64 counterpart. */
const COUNTERPART = new Map([
  ["lightningcss-win32-x64-msvc", "lightningcss-linux-x64-gnu"],
  ["@next/swc-win32-x64-msvc", "@next/swc-linux-x64-gnu"],
  ["@tailwindcss/oxide-win32-x64-msvc", "@tailwindcss/oxide-linux-x64-gnu"],
  ["@unrs/resolver-binding-win32-x64-msvc", "@unrs/resolver-binding-linux-x64-gnu"],
  ["@esbuild/win32-x64", "@esbuild/linux-x64"],
  ["@img/sharp-win32-x64", "@img/sharp-linux-x64"],
]);

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));

const found = [];
const unmapped = [];

for (const [path, entry] of Object.entries(lock.packages ?? {})) {
  if (!path.includes("win32")) continue;
  const name = path.replace(/^.*node_modules\//, "");
  const counterpart = COUNTERPART.get(name);
  if (!counterpart) {
    unmapped.push(name);
    continue;
  }
  found.push(`${counterpart}@${entry.version}`);
}

/**
 * A win32 package with no mapping means a new native family entered the
 * tree and this list did not keep up. Failing is the point: the alternative
 * is CI quietly building without it until something breaks at runtime.
 */
if (unmapped.length > 0) {
  console.error(
    `unmapped win32 package(s): ${unmapped.join(", ")}\n` +
      `Add the linux-x64 counterpart to COUNTERPART in ${import.meta.url
        .split("/")
        .pop()}.`
  );
  process.exit(1);
}

// Same guard as check-plan-files.mjs, for the same reason: an empty result
// and a broken script look identical from the outside.
if (found.length === 0) {
  console.error(
    "found no win32 packages in package-lock.json.\n" +
      "Either the lockfile became portable — in which case delete this script\n" +
      "and go back to plain `npm ci` — or this stopped working. Not guessing."
  );
  process.exit(1);
}

console.log(found.join(" "));
