Commit all staged and unstaged changes, push to the current branch, and if on a feature branch, offer to open a PR. Follow these steps exactly:

1. Run `git status` (never use -uall), `git diff`, and `git log --oneline -5` in parallel to understand what changed.
2. Stage all modified and tracked files. Analyze the changes and write a conventional commit message (feat/fix/chore/refactor/docs) that summarizes the "why". End the message with the Co-Authored-By trailer. Do NOT stage `.env`, `.env.local`, `node_modules/`, or `src/generated/`.
3. Push the commit to origin on the current branch: `git push origin <current-branch>`.
4. **Security Review Gate** — Before creating a PR, run a full security review:
   - Execute all steps from `/security-review` on the current branch.
   - If the verdict is **PASS**: proceed to step 5.
   - If the verdict is **FAIL**:
     - Present the full security review report to the user.
     - Ask the user to choose one of:
       - **Fix**: Stop here. The user will fix the issues and re-run `/ship`.
       - **Override**: Proceed to PR creation, but prepend a security override notice to the PR body: `> ⚠️ **Security review overridden.** Findings: [summary of CRITICAL/HIGH findings]. Manual review required.`
       - **Abort**: Stop entirely. Do not create a PR.
5. If on a feature/fix/docs/refactor branch (not `main`):
   - Ask the user if they want to open a PR via `gh pr create`.
   - If yes: create the PR with a short title and a brief summary body. Default base is `main` unless the repo uses `develop`.
6. If on `main`: confirm the push succeeded and the branch is up to date.
7. Print a short summary of what was committed.

If any step fails, stop immediately and report the error — do NOT force-push or use destructive flags.

## Note on SDK upgrades

If your changes include version bumps to `@upstart13-com/aiden-*` packages, **stop** — those should come from `npx aiden upgrade`, not hand-edits. Revert the version changes, run `npx aiden upgrade`, and ship the upgrade PR separately from feature work.
