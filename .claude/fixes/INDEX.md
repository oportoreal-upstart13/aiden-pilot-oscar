# Fix Index

> Aggregated view of all known fixes. Update this file when adding new entries to any fix file.

| Category         | File                  | Entries | Structurally Prevented | Last Updated | Trend  |
| ---------------- | --------------------- | ------- | ---------------------- | ------------ | ------ |
| TypeScript/Build | `typescript-build.md` | 3       | 2 of 3                 | 2026-02-20   | Stable |
| Next.js          | `nextjs.md`           | 3       | 0 of 3                 | 2026-02-20   | Stable |
| UI/Frontend      | `ui.md`               | 9       | 2 of 9                 | 2026-08-21   | Growing |
| Prisma           | `prisma.md`           | 3       | 1 of 3                 | 2026-03-09   | Stable |
| AIDEN Security   | `aiden-security.md`   | 1       | 1 of 1                 | 2026-08-21   | New    |
| AIDEN AI         | `aiden-ai.md`         | 2       | 2 of 2                 | 2026-08-21   | New    |
| Testing          | `testing.md`          | 3       | 1 of 3                 | 2026-08-22   | New    |
| AIDEN CLI        | `aiden-cli.md`        | 4       | 0 of 4                 | 2026-08-22   | New    |

**Total: 28 active entries across 8 categories · 9 structurally prevented**

> On 2026-08-21 the hardcoded-colour entry in `ui.md` was found to be claiming
> `[STRUCTURALLY PREVENTED]` by an ESLint rule that did not exist in this
> repository's `eslint.config.mjs`. It was first downgraded to an honest gap —
> briefly taking the prevented count down — and then the gap was closed by
> writing the rule for real and proving it fails the build on `bg-gray-500`.
> The marker is back, and now true. That is what `ui.md` crossing this index's
> 5-entry threshold was supposed to trigger.

These entries ship with the AIDEN starter template — they are universal gotchas observed across customer apps (Tailwind v4, Prisma 7, Next.js App Router, TypeScript). Add your own as they come up.

## Update Protocol

When adding a new fix entry:

1. Append the entry to the appropriate `.claude/fixes/<category>.md` file
2. Update the entry count and "Last Updated" date in this index
3. If a category reaches 5+ entries, flag it in "Trend" as a candidate for a structural fix (linter rule, wrapper, or architecture change)
4. If no category file matches, create a new `.md` file and add a row here

## Stack-Specific Categories to Watch

As your project evolves, these categories may need fix files:

- `nextauth.md` — Session handling, provider config, protected route patterns
- `aiden-ai.md` — Provider switching, streaming, tool use gotchas
- `aiden-db.md` — Schema fragment merge errors, migration drift
- `stripe.md` — Webhook signature verification, idempotency, test vs live key mix-ups
- `sendgrid.md` — Template ID mismatches, sandbox mode, unsubscribe handling

## Periodic Review

Run `/review-fixes` weekly or after major milestones to consolidate entries, mark obsolete ones as `[RESOLVED]`, and propose structural fixes for fast-growing categories.
