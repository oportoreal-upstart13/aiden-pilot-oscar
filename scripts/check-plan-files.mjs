#!/usr/bin/env node
/**
 * Assert that every file the plan names actually exists.
 *
 * This exists because of a specific failure. `docs/plans/deskline.md` named
 * `src/proxy.ts` in three places — one of them a finding that read "the app
 * currently serves no security headers" — and the file was never created.
 * Nothing in the repository disagreed: build, typecheck, lint, 40 tests and
 * 16 smoke probes were all green, because none of them can observe a file
 * that is not there. An external assessment found it instead.
 *
 * The verification that should have caught it compared `git diff --stat`
 * against the plan's file list in **one direction only**: which files landed
 * that the plan did not name. That question grows more reassuring the more
 * work you do, and it is structurally incapable of detecting an absence.
 * This script asks the other question.
 *
 * The reverse direction — files that landed without being planned — stays
 * manual on purpose. There are ninety of them, every one already recorded as
 * a numbered deviation (D1–D15) with a root cause. Automating that side would
 * emit ninety lines of noise to restate a log that is already written and
 * already read.
 *
 * Usage: node scripts/check-plan-files.mjs [path/to/plan.md]
 */

import { existsSync, readFileSync } from "node:fs";

const PLAN = process.argv[2] ?? "docs/plans/deskline.md";

/**
 * Paths the plan names that are *correctly* absent, each with the reason.
 * An entry here is a claim that the file's absence is deliberate — if one of
 * these ever comes back, this script fails, which is the intent.
 */
const INTENTIONALLY_ABSENT = new Map([
  [
    "src/app/api/ai/chat/route.ts",
    "second AI surface, deleted in 429a4a6 as out of scope",
  ],
  [
    "src/app/api/dev/impersonate/route.ts",
    "impersonation backdoor, deleted in 429a4a6",
  ],
  [
    "src/app/dashboard/chat/page.tsx",
    "UI for the deleted second AI surface, deleted in 429a4a6",
  ],
]);

/** Expand `a/{b,c}.ext` into `a/b.ext` and `a/c.ext`. */
function expandBraces(path) {
  const match = path.match(/^(.*)\{([^}]+)\}(.*)$/);
  if (!match) return [path];
  return match[2].split(",").map((part) => `${match[1]}${part}${match[3]}`);
}

if (!existsSync(PLAN)) {
  console.error(`plan not found: ${PLAN}`);
  process.exit(1);
}

const plan = readFileSync(PLAN, "utf8");

// Backticked tokens rooted at a real top-level directory and ending in a
// source extension.
//
// Anchoring on the root matters more than it looks. An earlier version asked
// only for "contains a slash", and the plan's own prose broke it: a deviation
// entry referring to `impersonate/route.ts` — a fragment, written to identify
// a file already discussed, not to name a path — was extracted as a path and
// reported missing. Requiring a known root makes the extractor robust against
// prose instead of requiring prose to tiptoe around the extractor.
//
// It also excludes bare filenames like `middleware.ts`, which the plan uses to
// discuss a Next convention rather than a file in this repository.
const ROOTS = ["src", "prisma", "scripts", "docs", "\\.claude", "\\.github"];
const pattern = new RegExp(
  "`((?:" + ROOTS.join("|") + ")/[^`\\s]*\\.(?:ts|tsx|prisma|sql|mjs|sh|css))`",
  "g"
);
const named = [...plan.matchAll(pattern)].map((m) => m[1]);
const all = [...new Set(named.flatMap(expandBraces))].sort();

const globs = all.filter((p) => p.includes("*"));
const paths = all.filter((p) => !p.includes("*"));

/**
 * The vacuity guard, and the reason it is not optional.
 *
 * The first hand-run of this check reported zero missing files and was
 * wrong: its regex used `[A-Za-z0-9._/\[\]-]`, and in a POSIX bracket
 * expression a backslash does not escape `]`, so the class closed early and
 * matched nothing. **A check that finds no problems and a check that is
 * broken produce identical output.** Refusing to pass on an empty input is
 * the only thing that tells them apart.
 */
if (paths.length === 0) {
  console.error(
    `FAIL  extracted 0 file paths from ${PLAN}.\n` +
      `      A plan with no paths is far more likely to mean the extraction\n` +
      `      broke than that the plan names no files. Refusing to report a\n` +
      `      pass on an empty set.`
  );
  process.exit(1);
}

const missing = paths.filter(
  (p) => !existsSync(p) && !INTENTIONALLY_ABSENT.has(p)
);
const resurrected = [...INTENTIONALLY_ABSENT.keys()].filter((p) =>
  existsSync(p)
);

console.log(`plan:     ${PLAN}`);
console.log(
  `checked:  ${paths.length} concrete path(s)` +
    (globs.length ? `, skipped ${globs.length} glob(s): ${globs.join(", ")}` : "")
);
console.log(
  `expected absent: ${INTENTIONALLY_ABSENT.size} (deliberate deletions)`
);

if (missing.length === 0 && resurrected.length === 0) {
  console.log("\nOK  every path the plan names is present.");
  process.exit(0);
}

console.error("");
for (const p of missing) {
  console.error(`FAIL  planned but missing: ${p}`);
}
for (const p of resurrected) {
  console.error(
    `FAIL  expected to be absent but present: ${p}\n` +
      `      (${INTENTIONALLY_ABSENT.get(p)})\n` +
      `      If it is back on purpose, remove it from INTENTIONALLY_ABSENT.`
  );
}
process.exit(1);
