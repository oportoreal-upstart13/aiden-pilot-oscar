# Fix Index

> Aggregated view of all known fixes. Update this file when adding new entries to any fix file.

| Category         | File                  | Entries | Structurally Prevented | Last Updated | Trend  |
| ---------------- | --------------------- | ------- | ---------------------- | ------------ | ------ |
| TypeScript/Build | `typescript-build.md` | 3       | 2 of 3                 | 2026-02-20   | Stable |
| Next.js          | `nextjs.md`           | 3       | 0 of 3                 | 2026-02-20   | Stable |
| UI/Frontend      | `ui.md`               | 5       | 2 of 5                 | 2026-02-20   | Stable |
| Prisma           | `prisma.md`           | 3       | 1 of 3                 | 2026-03-09   | Stable |

**Total: 14 active entries across 4 categories · 5 structurally prevented**

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
