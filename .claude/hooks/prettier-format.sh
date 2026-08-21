#!/bin/bash
# prettier-format.sh
# Automatically runs Prettier on every file Claude edits.
# Runs silently — no output unless an error occurs.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only format file types Prettier handles
if ! echo "$FILE_PATH" | grep -qE '\.(ts|tsx|js|jsx|json|css|md|mdx)$'; then
  exit 0
fi

# Resolve to absolute path
if [[ "$FILE_PATH" == /* ]]; then
  FULL_PATH="$FILE_PATH"
else
  FULL_PATH="${CLAUDE_PROJECT_DIR}/${FILE_PATH}"
fi

# Run Prettier silently — don't fail the hook if Prettier has an issue
if [ -f "$FULL_PATH" ]; then
  cd "$CLAUDE_PROJECT_DIR" && npx prettier --write "$FULL_PATH" --log-level silent 2>/dev/null || true
fi

exit 0
