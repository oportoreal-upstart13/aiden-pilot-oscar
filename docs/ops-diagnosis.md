# Ops Diagnosis — `aiden upgrade`, no-ops, and the duplicate-logging trap

Written against the CLI's own bundle and against runs captured in
`docs/evidence/`, not from memory. Where something was not reproduced here, it
says so.

The bundle read is `@upstart13-com/aiden-cli@2.0.1`, at
`…/npm-cache/_npx/40afc756ecb4e6f8/node_modules/@upstart13-com/aiden-cli/dist/cli.js`.

> **Always use the scoped name.** `npx aiden` resolves to `aiden@0.0.3`, an
> unrelated third-party package by a different author that npm will happily
> download and execute. Every command below is `npx @upstart13-com/aiden-cli`.
> See `.claude/fixes/aiden-cli.md`.

---

## 1. What `aiden upgrade` actually does — the eight steps

In order, from `src/commands/upgrade.ts` as bundled. Each step can end the run.

| # | Step | Exit behaviour |
|---|------|----------------|
| 1 | **Working-tree check.** `git status --porcelain` must be empty. Skipped entirely under `--dry-run`. | Dirty tree → `✗ Working tree is not clean. Commit or stash…`, **returns 2** |
| 2 | **Load config.** Reads `aiden.config.ts` and takes `config.version` as the current version. Note this is the *declared* version, not what is installed. | Unparseable config → fails here (see `.claude/fixes/aiden-cli.md` for the CRLF/`//` parse defect) |
| 3 | **Resolve target version.** `fetchLatestVersion(AIDEN_PACKAGES[0])`, i.e. `npm view @upstart13-com/aiden-ai version`, unless `--target-version` was passed. | Null → `✗ Could not resolve latest version from registry.`, **returns 1** |
| 4 | **Compare.** `compareSemver(current, target) >= 0`. | Already current → `✓ Already up to date.`, **returns 0** |
| 5 | **Run codemods** for the version range, unless `--skip-codemods`. Prints one line per codemod and any scaffold reports. | Errors are printed per-codemod; the run continues |
| 6 | **Bump and install.** Rewrites `@upstart13-com/aiden-*` versions in `package.json`, detects the package manager, installs. | Install failure → `✗ Install failed.`, **returns the installer's status** |
| 7 | **Migrate.** `npx prisma migrate deploy --schema prisma/schema.prisma`, unless `--skip-migrate`. | Failure → `✗ Migration failed.`, **returns its status** |
| 8 | **Record.** Bumps `version` in `aiden.config.ts`, then `git add -A` and `git commit`, unless `--skip-commit` or not a git repo. | — |

Under `--dry-run` the run stops after step 5 and prints what steps 6–8 would
have done. Nothing is written.

The six packages it manages: `aiden-ai`, `aiden-auth`, `aiden-db`,
`aiden-logging`, `aiden-security`, `aiden-ui`. Note that `aiden-realtime` — a
runtime dependency of this app — is **not** in that list, so its version is
never bumped by `upgrade`.

---

## 2. The five causes of a no-op, and how to confirm each

The plan promised "the five no-op causes" without enumerating them. These five
are derived by reading the code above, not recalled: they are the conditions
under which the command completes successfully having changed nothing, or
having silently skipped a phase that was supposed to do the work.

### Cause 1 — Already up to date

The real no-op, and the intended one. Step 4 short-circuits.

**Confirm it:** the output says `✓ Already up to date.` and the exit code is 0.
Cross-check independently, because step 4 trusts `aiden.config.ts`:

```bash
npm view @upstart13-com/aiden-ai version     # what is published
node -p "require('./node_modules/@upstart13-com/aiden-ai/package.json').version"   # what is installed
grep 'version:' aiden.config.ts              # what the config claims
```

All three agreeing is what makes this a true no-op. In this repository all
three read `2.0.1`.

### Cause 2 — No codemods registered for the range

The upgrade proceeds and installs, but the migration-of-your-code phase does
nothing.

**Confirm it:** the output contains `(no codemods registered for this range)`.
This is benign for a patch bump and suspicious for a major one — a major with
no codemods means either the SDK made no breaking source changes, or the
codemods were not published.

### Cause 3 — `--dry-run`

By design. The run ends after codemods and prints a "would…" summary.

**Confirm it:** the output ends with `No files were written. Re-run without
--dry-run to apply.` and `git status` is unchanged.

### Cause 4 — A skip flag neutralised the phase you cared about

`--skip-codemods`, `--skip-migrate` and `--skip-commit` each silence one phase.
All three together reduce `upgrade` to a package-version bump plus an install.

**Confirm it:** re-read the invocation. The output simply omits the section —
there is no "skipped" notice for `--skip-migrate`, so an upgrade that quietly
did not migrate looks identical to one that had no migrations to run.

### Cause 5 — `aiden.config.ts` disagrees with `node_modules`

Step 4 compares the *declared* version, never the installed one. If
`aiden.config.ts` already says `2.1.0` — because someone hand-edited it, or a
previous run reached step 8 after failing earlier — the CLI reports "Already up
to date" while the packages on disk are still older. A **false** no-op.

**Confirm it:** run the three commands from Cause 1. If the config is ahead of
`node_modules`, this is what happened. This is the concrete reason `CLAUDE.md`
forbids hand-editing `@upstart13-com` versions in `package.json`: the config
version is the CLI's only sense of where you are.

---

## 3. The sixth cause — and the one that actually happened here

**None of the five above applied to this repository**, because the premise did
not hold: the run was not a no-op. It was a failure, at step 3, with a message
that names the wrong culprit.

```
$ npx @upstart13-com/aiden-cli upgrade --dry-run
aiden upgrade (dry-run)

Current version: 2.0.1
✗ Could not resolve latest version from registry.
exit 1
```

The registry was never contacted.

### Root cause, from the bundle

```js
function fetchLatestVersion(pkg2) {
  const r = spawnSync("npm", ["view", pkg2, "version"], { encoding: "utf8" });
  if (r.status !== 0) return null;
  const version = r.stdout.trim();
  return version || null;
}
```

`spawnSync("npm", …)` with **no `shell: true`**. On Windows `npm` is `npm.cmd`,
and since Node 18.20 / 20.12 spawning a `.cmd` without a shell is blocked as
hardening against CVE-2024-27980. The call never launches npm; it returns
`{ status: null, error: "ENOENT" }`, the guard `if (r.status !== 0)` fires, and
the caller reports a registry problem for a process-spawn problem.

### Reproduction, three ways

Node v22.22.3, same machine, same package the CLI queries
(`AIDEN_PACKAGES[0]` = `@upstart13-com/aiden-ai`):

```
1. From the shell
   $ npm view @upstart13-com/aiden-ai version
   2.0.1

2. Exactly as the CLI does it — spawnSync, no shell
   { "status": null, "error": "ENOENT", "stdout": "", "stderr": "" }

3. The same call with shell: true
   { "status": 0, "stdout": "2.0.1" }
```

### Why the obvious diagnosis is wrong

This repository has no project-level `.npmrc` and no `GITHUB_PAT`, so "private
registry auth" is the natural conclusion and it is incorrect. A user-level
`~/.npmrc` supplies the credentials, the scope is configured
(`npm config get @upstart13-com:registry` → `https://npm.pkg.github.com`), and
every scoped package resolves:

```
@upstart13-com/aiden-ai        2.0.1
@upstart13-com/aiden-cli       2.0.1
@upstart13-com/aiden-db        2.0.1
@upstart13-com/aiden-security  2.0.1
@upstart13-com/aiden-ui        2.0.1
```

**Before believing the message, run `npm view <pkg> version` by hand.**

### Would it have been a no-op?

Yes — Cause 1. All six packages publish 2.0.1, all six are installed at 2.0.1,
and `aiden.config.ts` declares 2.0.1. A working `--dry-run` would correctly
report nothing to do. The distinction matters: "nothing to upgrade" and "the
tool cannot run" produce different exit codes and demand different responses.

**Upstream fix:** pass `shell: true`, or resolve `npm.cmd` on
`process.platform === "win32"`, or query the registry over HTTP instead of
shelling out. And separate the two failure modes in the message — "could not
run npm" and "the registry did not answer" have different remedies.

Full capture: `docs/evidence/upgrade-dryrun-2026-08-22.txt`.

---

## 4. Recovery runbook

### The upgrade refuses to start — "Working tree is not clean" (exit 2)

Commit or stash. This guard exists because steps 6–8 rewrite `package.json`,
`node_modules`, the database and `aiden.config.ts`; without a clean baseline
there is no way to tell an upgrade's changes from yours. Do not work around it
by adding `--dry-run` and then applying by hand.

### The upgrade dies at step 6 — "Install failed"

`package.json` has already been bumped, `node_modules` has not. The tree is
inconsistent.

```bash
git checkout -- package.json package-lock.json
npm install
```

Then investigate the install failure — usually a missing `.npmrc` for the
`@upstart13-com` scope — before retrying.

### The upgrade dies at step 7 — "Migration failed"

The dangerous one. Packages are new, the database schema is old, and
`aiden.config.ts` still declares the *old* version because step 8 never ran —
so a naïve retry will attempt the whole upgrade again.

1. Read the migration error. `npx prisma migrate status` shows what applied.
2. If the failure is a drift or a partially-applied migration on a **local dev**
   database, `npx prisma migrate reset` and then re-seed with
   `npm run db:seed`. The re-seed is a separate step and not optional —
   Prisma 7 removed seed-on-reset, so reset leaves every table empty even
   with `migrations.seed` configured. The seed is idempotent — verified by
   running it twice with identical row counts.
3. On anything that is not disposable, resolve the migration forward rather
   than resetting.
4. Only then re-run the upgrade.

### The whole upgrade needs to be undone

Step 8 commits everything as one commit, which is what makes this simple:
`git revert <that commit>`, then `npm install` to restore `node_modules`, then
`npx prisma migrate resolve --rolled-back <migration>` if step 7 had applied
one. Audit rows written in the meantime stay — audit history is evidence, not
state to unwind.

### On Windows, the upgrade cannot run at all

See §3. Run it from WSL or a Unix runner. Do **not** hand-bump the versions in
`package.json`: `CLAUDE.md` forbids it precisely because steps 5 and 7 —
codemods and migrations — are the part that hand-editing skips.

---

## 5. Duplicate logging — root cause, confirmed empirically here

### The symptom

Audit events split across two destinations. Some land in the `audit_logs`
table; others appear only on stdout as structured log lines from a logger
named `aiden:audit`. Nothing errors. `npm ls @upstart13-com/aiden-security`
reports a single version.

Observed in this build on 2026-08-21: `ticket.create` reached the table while
`audit.auth.signin`, fired by the same process seconds earlier, did not.

```
{"level":30,"name":"aiden:audit","event":"audit.auth.signin",
 "actorId":"cmt344vlg…","metadata":{"provider":"credentials"},
 "msg":"audit.auth.signin"}
```

Meanwhile:

```
     event     | count
---------------+-------
 ticket.create |     1
```

### The root cause

`setAuditSink()` writes to a **module-level variable** inside
`@upstart13-com/aiden-security`. `auditLog()` reads that same variable — in
whichever *instance* of the module the calling code resolved.

Next does not guarantee one instance. `instrumentation.ts` is bundled into its
own server chunk, separate from the route chunks. Registering the sink only
from there sets the variable on an instance the route handlers never resolve,
so `auditLog()` in a route still holds the package's **default** sink, which
logs to stdout instead of writing a row.

That is what "duplicate logging" is: not one event logged twice, but two live
sinks in one process, each serving a different half of the code, with the
default one masquerading as success because it does emit *something*.

### The fix — register from inside the route module graph

Two side-effect imports, each covering a graph that `instrumentation.ts` does
not reach:

```ts
// src/lib/security.ts — imported by every API route
import "@/lib/audit";

// src/lib/auth.ts — reached by /api/auth/[...nextauth], which never
// imports src/lib/security.ts
import "@/lib/audit";
```

`src/lib/auth.ts` must import `@/lib/audit` **directly**. Routing it through
`src/lib/security.ts` to inherit the registration is a cycle, because
`security.ts` imports `auth.ts` for `configureSecurity`'s `getSession`.

### Confirming the fix

Empirically, never by reading the code. Sign in, then query:

```bash
docker exec u13-postgres psql -U u13admin -d deskline_op_dev \
  -c "SELECT event, count(*) FROM audit_logs GROUP BY event ORDER BY event;"
```

`auth.signin` appearing in the table is the proof. Before the `auth.ts` import
it was absent; after it, present. Captured in
`docs/evidence/phase4-verification-2026-08-22.txt`.

### The general rule

Any SDK that registers a sink, a hook or a client through a module-level
mutable — `setAuditSink`, `setAIUsageSink`, `configureSecurity` — has this
failure mode under a bundler that can duplicate modules. Register from a module
the consuming code definitely imports, and verify by observing the effect,
not by reading the registration.
