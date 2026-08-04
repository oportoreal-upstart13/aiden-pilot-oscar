# Fix Entry Template

Use the **short format** for straightforward fixes:

```
- **[YYYY-MM-DD]** Brief issue → Fix/correct approach
```

Use the **extended format** for fixes that took multiple attempts or had non-obvious root causes:

```
- **[YYYY-MM-DD]** Brief issue
  - **Symptom**: What error/behavior was observed
  - **Wrong approach**: What was tried first and why it failed
  - **Root cause**: The actual underlying issue
  - **Fix**: The correct solution
  - **Prevention**: How to avoid this in the future (linter rule, abstraction, documentation)
```

## Guidelines

- Always include the date in `[YYYY-MM-DD]` format
- Be specific about error messages — copy them verbatim when possible
- Include file paths where the issue occurred
- If the fix contradicts common intuition, explain *why* the obvious approach fails
- After adding an entry, update `.claude/fixes/INDEX.md` with the new count and date
