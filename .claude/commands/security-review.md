Run a comprehensive security review on the current branch before PR creation. This command analyzes code changes for security vulnerabilities, scans dependencies against live vulnerability databases, and produces a structured pass/fail report.

**Prerequisite:** `osv-scanner` must be installed (`brew install osv-scanner`).

## Phase 1 — Gather Context

1. Run these commands in parallel:
   - `git diff develop...HEAD --name-only` to list changed files
   - `git diff develop...HEAD` for the full diff
   - `git log develop..HEAD --oneline` for commit history on this branch
   - If on `develop` or no diff against develop: fall back to `git diff --cached` + `git diff` for uncommitted changes

2. Identify newly added or upgraded packages:
   - Run `git diff develop...HEAD -- package.json` (or `git diff -- package.json` if on develop)
   - Extract any added/changed lines in `"dependencies"` or `"devDependencies"`
   - Note the package names and versions for Phase 3

3. Collect the list of changed `.ts` and `.tsx` files for targeted analysis.

## Phase 2 — Static Code Analysis

Analyze the changed files (from Phase 1) across six security categories. For each category, read the relevant files and check for violations.

### 2a. Auth & Access Control

Check every changed or new `route.ts` file under `src/app/api/`:

- **CRITICAL:** Route handlers (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) MUST call `auth()` before any data access. Exception: webhook endpoints and explicitly public routes.
- **CRITICAL:** Database queries on user data MUST include `userId: session.user.id` scoping — no unscoped queries (IDOR risk).
- **HIGH:** NextAuth callbacks must validate redirect URLs and session data.
- If a route intentionally skips auth (e.g., Stripe webhook), note it as an acknowledged exception, not a finding.

### 2b. Injection Prevention

Search changed files for:

- **CRITICAL:** `$executeRawUnsafe` or `$queryRawUnsafe` — use `$executeRaw` with tagged template literals instead
- **CRITICAL:** `eval()` or `new Function()` — refactor to avoid dynamic code evaluation
- **HIGH:** `dangerouslySetInnerHTML` — must use DOMPurify or equivalent sanitization
- **HIGH:** Request body used without Zod `.safeParse()` or `.parse()` validation — check that `request.json()` results are validated before use

### 2c. Data Exposure

Check changed files for:

- **HIGH:** API responses returning full Prisma models instead of explicit `select` — over-exposure of fields
- **HIGH:** Error responses that include stack traces, SQL queries, or internal file paths
- **MEDIUM:** `console.log` or `console.error` statements logging sensitive data (tokens, passwords, full API keys, user PII)
- **MEDIUM:** New `NEXT_PUBLIC_*` environment variables — verify they contain only public-safe values (never secrets)

### 2d. Stripe Security

If any Stripe-related files changed:

- **CRITICAL:** Webhook route (`src/app/api/stripe/webhook/route.ts`) must use `stripe.webhooks.constructEvent()` for signature verification
- **HIGH:** Prices and amounts must come from server-side config or Stripe API — never from the client request body
- **MEDIUM:** Webhook metadata (e.g., `userId`) should be validated against the actual Stripe customer/subscription owner

### 2e. Server/Client Boundary

Check all changed `"use client"` files:

- **CRITICAL:** Must NOT import any of: `@prisma/client`, `bcryptjs`, `stripe`, `@sendgrid/mail`, `node:fs`, `node:child_process`, `node:crypto`, or any file from `src/lib/` that instantiates server-only clients
- **HIGH:** Server Actions (`"use server"`) must validate all inputs with Zod — they are publicly accessible API surfaces

### 2f. Sensitive Data in Code

Search the full diff for:

- **CRITICAL:** Stripe secret keys: `sk_live_*`, `sk_test_*`
- **CRITICAL:** Stripe webhook secrets: `whsec_*`
- **CRITICAL:** Private key blocks: `-----BEGIN ... PRIVATE KEY-----`
- **HIGH:** SendGrid API keys: strings matching `SG.[a-zA-Z0-9_-]{20,}`
- **HIGH:** JWT tokens: strings starting with `eyJ`
- **HIGH:** Hardcoded passwords, database connection strings, or API keys assigned to variables

## Phase 3 — Live Vulnerability Scanning

### 3a. npm audit

Run:

```bash
npm audit --json 2>/dev/null
```

Parse the JSON output:

- Count vulnerabilities by severity (critical, high, moderate, low)
- For CRITICAL and HIGH: note the package name, vulnerability title, and advisory URL
- If npm audit returns exit code 0 with no vulnerabilities, mark as CLEAR

### 3b. osv-scanner

Run:

```bash
osv-scanner --lockfile package-lock.json --format json 2>/dev/null
```

If `osv-scanner` is not installed, STOP and tell the user:

> `osv-scanner` is required but not installed. Install it with: `brew install osv-scanner`

Parse the JSON output:

- Extract CVE IDs, severity ratings, and affected package names
- Cross-reference with npm audit findings to avoid duplicate reports
- For CRITICAL and HIGH: note the CVE ID, package, and description

### 3c. CVE Search for New Packages

For each newly added or upgraded package identified in Phase 1:

- Use the WebSearch tool to search: `"<package-name>" "<version>" CVE vulnerability security advisory`
- Review the top 3-5 results for relevant security advisories
- Report any findings with links
- If no results or no relevant CVEs found, mark as CLEAR
- If WebSearch is unavailable or fails, note it and continue — do not block on this step

## Phase 4 — Compile Report

Generate the following structured report:

```
## Security Review Report

**Branch:** <branch-name>
**Base:** develop
**Reviewed:** <YYYY-MM-DD HH:MM>
**Changed files:** <count>
**Reviewer:** Claude Code (automated)

---

### Code Analysis

| Category | Status | Findings |
|----------|--------|----------|
| Auth & Access Control | PASS/FAIL | <summary or "No issues"> |
| Injection Prevention | PASS/FAIL | <summary or "No issues"> |
| Data Exposure | PASS/FAIL | <summary or "No issues"> |
| Stripe Security | PASS/FAIL/N/A | <summary or "No Stripe changes"> |
| Server/Client Boundary | PASS/FAIL | <summary or "No issues"> |
| Sensitive Data | PASS/FAIL | <summary or "No issues"> |

### Dependency Vulnerabilities

| Source | Critical | High | Medium | Low |
|--------|----------|------|--------|-----|
| npm audit | <n> | <n> | <n> | <n> |
| osv-scanner | <n> | <n> | <n> | <n> |

<If any CRITICAL or HIGH dependency vulns, list them here with package name, CVE, and advisory URL>

### New Package CVE Check

- <package>@<version>: CLEAR / <finding summary + link>

### Detailed Findings

<For each finding, list:>
- **[SEVERITY] Category — File:Line** — Description of the issue and how to fix it

---

### Verdict: PASS / FAIL

<Verdict reasoning>
```

## Phase 5 — Verdict

Apply these rules to determine the verdict:

**FAIL if ANY of:**

- Any CRITICAL code analysis finding (categories 2a-2f)
- Any HIGH code analysis finding (categories 2a-2f)
- Any CRITICAL dependency vulnerability (npm audit or osv-scanner)

**PASS if:**

- Zero CRITICAL findings across all categories
- Zero HIGH code analysis findings
- HIGH/MEDIUM/LOW dependency vulnerabilities are noted but do not block

**Edge cases:**

- If the branch has no code changes (docs only): auto-PASS with note "Documentation-only changes"
- If only config/CI files changed: run Phase 3 only (dependency scanning), skip Phase 2
- MEDIUM and LOW findings are reported but never cause a FAIL

## Important

- Do NOT skip phases. Run them in order.
- Do NOT auto-fix findings. Report them and let the user decide.
- If `osv-scanner` is not installed, STOP immediately and ask the user to install it.
- The WebSearch step (3c) is best-effort — if it fails, note the failure and continue.
- This command is automatically invoked by `/ship` before PR creation. It can also be run standalone at any time.
- After the review, append a progress entry: `[YYYY-MM-DD HH:MM] completed security(review): security review on <branch> — <PASS/FAIL>`
