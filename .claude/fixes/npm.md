# npm / Dependency Fixes

- **[2026-09-01]** `overrides` is the mechanism for a transitive CVE, and a clean scan expires
  - See `docs/evidence/security-review-2026-08-22.md` (2026-09-01 addendum) for the full record. Short version: two `mysql2` advisories were published nine and ten days *after* a review that reported 0/0/0/0, and nothing in the repository re-ran the scanner. The fix was one `overrides` entry; the lesson is that a green dependency report is true on its date and nowhere else, which is what the scheduled `vulnerabilities` job in CI now covers.

- **[2026-09-02]** A lockfile generated on Windows is not installable on Linux, and `npm ci` reports success anyway

  - **Symptom**: the first CI run failed the build with `Error: Cannot find module '../lightningcss.linux-x64-gnu.node'`. The install step above it was **green**.

  - **Root cause**: `package-lock.json` was generated on Windows and records only the `win32-x64` variant of every multi-platform family it contains, although each declares many:

    | family                | variants declared | in the lockfile |
    | --------------------- | ----------------- | --------------- |
    | `esbuild`             | 19                | 1               |
    | `sharp`               | 20                | 1               |
    | `unrs-resolver`       | 20                | 1               |
    | `lightningcss`        | 11                | 1               |
    | `@tailwindcss/oxide`  | 11                | 1               |
    | `next`                | 8                 | 1               |

    Six platform binaries where a portable lockfile holds 89. The committed lockfile has therefore never been installable on Linux — CI, Docker, or any Linux deploy — and nobody noticed because nobody had installed off Windows.

  - **Why it passed silently, which is the part worth remembering**: those binaries are declared as **optional** dependencies. `npm ci` installs exactly the lockfile, finds no Linux entries to install, skips them without a warning, and **exits 0**. The tree it produces has no native CSS transformer, and the failure surfaces one step later inside a build that looks unrelated. *A green install is not a complete install.*

  - **Two fixes that did not work, both measured rather than reasoned about**:
    - `npm install` instead of `npm ci` — pushed to CI, failed identically. With a lockfile present npm prefers it and does not re-resolve optional dependencies.
    - `npm install --package-lock-only --os=linux --cpu=x64` — produced a zero-byte diff: no versions changed, no packages added, no packages removed. npm reuses the existing lock rather than re-resolving.

  - **The fix that would work but was rejected**: deleting `package-lock.json` and regenerating. It genuinely produces a portable lockfile (89 platform binaries), but it also moves **78 package versions** — `next` 16.3.1 → 16.3.4, `prisma` 7.9.1 → 7.10.0, `zod`, `openai`, the whole `@typescript-eslint` set — plus an `ajv` 8.20.0 → 6.15.0 downgrade, because `package.json` uses caret ranges and the registry moved on since the lockfile was written. That is a dependency refresh wearing a portability fix's clothes: it needs its own review and its own test run, not a silent ride along with a CI pipeline.

  - **Fix applied**: `scripts/linux-native-deps.mjs` reads the versions the lockfile **already pins** for `win32` and prints their `linux-x64` counterparts, and CI runs `npm ci` followed by `npm install --no-save $(node scripts/linux-native-deps.mjs)`. The installed tree matches the lockfile rather than drifting from it. Versions are derived, not hardcoded — a hardcoded list goes stale the first time a dependency is bumped, and goes stale *silently*, which is the failure mode this whole entry is about. An unmapped `win32` package is a hard error rather than a skip, so a new native family entering the tree cannot slip past.

  - **Verified**: CI green end to end — `npm ci` 1180 packages, `+6` Linux binaries, `npm audit` clean, build compiled with `ƒ Proxy (Middleware)` present, three migrations applied against a fresh Postgres 17, seed run through `npm run db:seed`, 40/40 tests and 16/16 smoke probes.

  - **Still open**: the lockfile itself. This works around it for `linux-x64`; it does nothing for arm64 runners, Apple Silicon contributors, or Alpine/musl images.

  - **Prevention**: run an install on Linux — CI counts — before believing a lockfile is portable, and never read a green `npm ci` as proof the tree is complete. For a project that will ever deploy to Linux, the lockfile should be regenerated deliberately, as its own reviewed change, with the version drift examined.

**Structurally prevented:** Partly. CI now installs on Linux on every push, so this exact break cannot return unnoticed — but the lockfile is still Windows-shaped and the workaround only covers `linux-x64`.
