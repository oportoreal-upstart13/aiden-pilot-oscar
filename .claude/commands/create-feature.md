Create a new feature branch from the current branch. Follow these steps exactly:

1. **Ask for the feature name** using AskUserQuestion:

   > What is the name of the feature? (e.g. "user onboarding", "stripe billing portal")

   **STOP and wait for the user's answer.**

2. **Sanitize the name** into a branch slug: lowercase, replace spaces and special characters with hyphens, remove consecutive hyphens. The final branch name is `feature/<slug>`.

3. **Check for uncommitted changes** by running `git status` (never use -uall).
   - If the working tree is **clean**: proceed to step 4.
   - If there are **modified or untracked files**: ask the user using AskUserQuestion:

     > You have uncommitted changes on the current branch. What would you like to do?
     >
     > 1. **Commit** — stage and commit changes before switching
     > 2. **Stash** — stash changes and switch (you can restore them later with `git stash pop`)
     > 3. **Discard** — discard all changes and switch (this cannot be undone)
     > 4. **Abort** — cancel branch creation

     **STOP and wait for the user's answer.** Then:
     - **Commit**: stage all modified/tracked files (not `.env`, `.env.local`, or `node_modules/`), ask for a commit message using AskUserQuestion, and commit with the Co-Authored-By trailer.
     - **Stash**: run `git stash push -m "auto-stash before feature/<slug>"`.
     - **Discard**: run `git checkout -- .` and `git clean -fd` to remove all changes.
     - **Abort**: stop and inform the user that branch creation was cancelled.

4. **Create and switch to the new branch**:

   ```
   git checkout -b feature/<slug>
   ```

5. **Push the branch to origin** so it exists remotely:

   ```
   git push -u origin feature/<slug>
   ```

6. **Confirm** by printing:
   - The new branch name
   - Which branch it was created from
   - Whether changes were committed, stashed, or discarded (if applicable)
   - A reminder: "You're ready to start building. Run `/create-prd-tasks` to plan the feature, or start coding."

If any step fails, stop immediately and report the error — do NOT use destructive git flags.
