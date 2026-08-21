#!/bin/bash
# block-dangerous-commands.sh
# Blocks destructive git operations, --no-verify commits, and dangerous SQL commands.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Block force push (git push --force / -f)
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*(-f\b|--force\b|--force-with-lease\b)'; then
  echo "Blocked: Force push detected ('$COMMAND'). Force pushing can overwrite teammates' work. Confirm with the user before proceeding." >&2
  exit 2
fi

# Block git reset --hard
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  echo "Blocked: 'git reset --hard' discards all uncommitted changes permanently. Confirm with the user before running this." >&2
  exit 2
fi

# Block git clean -f (remove untracked files)
if echo "$COMMAND" | grep -qE 'git\s+clean\s+-[a-z]*f[a-z]*(\s|$)'; then
  echo "Blocked: 'git clean -f' permanently removes untracked files. Confirm with the user before running this." >&2
  exit 2
fi

# Block force-deleting main/master/develop branch
if echo "$COMMAND" | grep -qE 'git\s+branch\s+-D\s+(main|master|develop)\b'; then
  echo "Blocked: Attempting to force-delete a protected branch (main/master/develop). This is not allowed." >&2
  exit 2
fi

# Block --no-verify on commits (bypasses pre-commit hooks per CLAUDE.md)
if echo "$COMMAND" | grep -qE 'git\s+commit\s+.*--no-verify\b'; then
  echo "Blocked: '--no-verify' skips pre-commit hooks. Per CLAUDE.md this is not allowed. Fix the underlying issue instead." >&2
  exit 2
fi

# Block destructive SQL (e.g., in psql, prisma CLI, or scripts)
if echo "$COMMAND" | grep -qiE '\b(DROP\s+TABLE|DROP\s+DATABASE|DROP\s+SCHEMA|TRUNCATE\s+TABLE)\b'; then
  echo "Blocked: Destructive SQL operation detected in command. Confirm with the user before running: '$COMMAND'" >&2
  exit 2
fi

# Block rm -rf on dangerous targets (root, home dir, project root)
if echo "$COMMAND" | grep -qE 'rm\s+-[a-z]*r[a-z]*f[a-z]*\s+(\/\s|\/\"|"\/"\s|~\s|~\"|"\~")'; then
  echo "Blocked: Potentially destructive 'rm -rf' targeting root or home directory. Confirm with the user." >&2
  exit 2
fi

exit 0
