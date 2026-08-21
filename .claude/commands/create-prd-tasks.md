Generate a PRD and task list for a feature request. This command runs 4 stages sequentially, pausing for user input between stages.

**Input:** $ARGUMENTS (the feature request or description)

---

## Stage 1: Generate PRD

1. Analyze the user's feature request: "$ARGUMENTS"
2. Ask 3-5 clarifying questions using AskUserQuestion covering: target users, success criteria, edge cases, dependencies, and any constraints.
3. **STOP and wait for the user's answers.** Do not proceed until the user responds.
4. Generate the PRD with this structure:
   - **Title** and **Status** (Draft)
   - **Problem Statement** — what problem this solves and for whom
   - **Goals** — 3-5 measurable outcomes
   - **Non-Goals** — explicit exclusions to scope
   - **User Stories** — `As a [role], I want to [action] so that [outcome]`
   - **Functional Requirements** — numbered, specific, testable
   - **Non-Functional Requirements** — performance, security, accessibility
   - **UI/UX Notes** — design system references, layout notes
   - **API Changes** — new routes, modified routes, schema changes
   - **Dependencies** — external services, libraries, other features
   - **Open Questions** — unresolved decisions
5. Save PRD to `/tasks/prd-[feature-name].md`. Create the `tasks/` directory if it doesn't exist.
6. Present the PRD and say: **"Stage 1 complete. PRD saved. Proceeding with Stage 2..."**
7. **Continue with Stage 2.**

## Stage 2: Generate Parent Tasks

1. Analyze the PRD from Stage 1.
2. Generate high-level parent tasks. Always include:
   - Task 0.0: "Create feature branch" (`git checkout -b feature/[feature-name]`)
   - Cover: schema/migration changes, API routes, UI pages/components, tests, documentation
3. Identify the relevant files section (files likely to be created or modified).
4. Save initial task list (parent tasks only) to `/tasks/tasks-[feature-name].md`.
5. Present parent tasks and say: **"Stage 2 complete. Parent tasks generated. Proceeding with Stage 3..."**
6. **Continue with Stage 3.**

## Stage 3: Generate Sub-Tasks

1. For each parent task, generate detailed actionable sub-tasks specific enough for a junior developer.
   - Reference specific file paths (e.g., `src/app/api/...`, `src/components/...`, `src/lib/...`)
   - Note shadcn/ui components to use, Zod schemas to define, Prisma queries to write
   - Include: design system pre-flight (which `docs/design-system/*.md` files to read)
2. Update `/tasks/tasks-[feature-name].md` with the full task list (parents + sub-tasks + relevant files + notes).
3. Present the full task list and say: **"Stage 3 complete. Sub-tasks generated. Proceeding with Stage 4..."**
4. **Continue with Stage 4.**

## Stage 4: Gap Analysis (PRD vs Tasks)

1. Re-read both files.
2. For each functional requirement in the PRD, verify at least one sub-task addresses it.
3. Check for:
   - **Missing coverage:** PRD requirements with no corresponding task
   - **Orphaned tasks:** Tasks that don't trace back to any PRD requirement
   - **Missing error handling:** Happy paths covered but error states missing
   - **Missing auth/permission checks:** Protected routes without auth task
   - **Missing validation:** Forms/inputs without Zod schema tasks
   - **Missing test tasks:** Features without validation/testing tasks
4. Add any missing tasks/sub-tasks and update relevant files section.
5. Present gap analysis results and say: **"Stage 4 complete. Gap analysis finished."**

## Final Output

Confirm the two deliverables:

- `/tasks/prd-[feature-name].md` — the PRD
- `/tasks/tasks-[feature-name].md` — the complete task list

Provide a brief impact analysis: what this feature unlocks and any notable risks.

## Important

- Do NOT skip stages or combine them.
- Do NOT start implementing any code. This command is for planning only.
- Use the same `[feature-name]` slug for both filenames.
- Follow CLAUDE.md stack conventions: Next.js App Router, Prisma + PostgreSQL, NextAuth v5, Stripe, shadcn/ui.
