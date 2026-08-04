Run the post-task validation loop. This MUST be executed after completing any implementation task.

## Steps

1. Run `npm run lint` to check for code style and linting errors.
   - If lint fails: fix the issues, then re-run lint (max 2 retries).

2. Run `npx tsc --noEmit` to confirm no TypeScript errors.
   - If type errors appear: fix them before proceeding.

3. Check if any Prisma fragment files were added or modified (look for changes in `prisma/fragments/`).
   - If yes: run `npm run prisma:merge` to regenerate `prisma/schema.prisma` and confirm the composed schema is correct. Do NOT run `npm run db:migrate` unless explicitly requested.

4. Check if any migration files were added or modified (look for changes in `prisma/migrations/`).
   - If yes: confirm the migration file is correct SQL and note it in the progress log. Do NOT run `prisma migrate dev` unless explicitly requested.

5. If any validation step fails after retries:
   - Document the root cause in the appropriate `.claude/fixes/*.md` file using the template from `.claude/fixes/TEMPLATE.md`
   - Update `.claude/fixes/INDEX.md` with the new entry count
   - Stop and report the failure to the user

6. If all validations pass:
   - Append a progress entry to `.claude/progress.log` summarizing the completed task
   - Report success with a short summary of what was validated

## Important

- Do NOT skip steps. Run them in order.
- Do NOT run `npm run build` unless explicitly requested — it is expensive.
- If a new gotcha is discovered during validation, always record it in `.claude/fixes/` before reporting success.
