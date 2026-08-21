Review and consolidate the fixes knowledge base for compound learning. Run this periodically (weekly or after major milestones) to extract systemic improvements.

## Steps

1. Read ALL files in `.claude/fixes/` (excluding TEMPLATE.md and INDEX.md).

2. **Pattern analysis** — Look for:
   - Multiple fixes addressing the same root cause → Extract a rule to CLAUDE.md
   - Fixes that repeat across sessions → The fix isn't preventive enough, needs a structural solution
   - Fixes that are now obsolete (library updated, code removed, architecture changed) → Mark as `[RESOLVED]`
   - Categories growing fastest → Flag for structural intervention

3. **Escalation check** — For any category with 5+ entries:
   - Propose a structural change to prevent future occurrences:
     - ESLint rule or config tweak
     - Wrapper function or utility that enforces the correct pattern
     - Architecture change that eliminates the error class
     - Pre-commit hook that catches the issue
   - Present the proposal to the user for approval before implementing

4. **Consolidation** — For entries that can be generalized:
   - Merge related entries into a single, clearer entry
   - Move specific examples into a "History" sub-section

5. **Update INDEX.md** with current counts, dates, and trend assessments.

6. **Report** — Summarize findings:
   - Total fixes: X across Y categories
   - New since last review: N
   - Resolved/obsolete: N
   - Structural fixes proposed: N
   - Top risk area: [category]
