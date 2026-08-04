#!/bin/bash
# protect-sensitive-files.sh
# Blocks Claude from editing environment files, lockfiles, and .git internals.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

FILENAME=$(basename "$FILE_PATH")

# Block .env files (exact names)
PROTECTED_FILES=(".env" ".env.local" ".env.production" ".env.staging" ".env.test" ".env.development")
for f in "${PROTECTED_FILES[@]}"; do
  if [ "$FILENAME" = "$f" ]; then
    echo "Blocked: '$FILE_PATH' is a protected environment file. Environment files contain secrets and must never be edited by Claude. Edit them manually." >&2
    exit 2
  fi
done

# Block any .env.* glob
if [[ "$FILENAME" == .env.* ]]; then
  echo "Blocked: '$FILE_PATH' matches .env.* pattern. Environment files contain secrets and must never be edited by Claude." >&2
  exit 2
fi

# Block lockfiles
if [ "$FILENAME" = "package-lock.json" ] || [ "$FILENAME" = "yarn.lock" ] || [ "$FILENAME" = "pnpm-lock.yaml" ] || [ "$FILENAME" = "bun.lockb" ]; then
  echo "Blocked: '$FILE_PATH' is a lockfile. Lockfiles are managed by the package manager — run 'npm install' instead of editing directly." >&2
  exit 2
fi

# Block .git internals
if [[ "$FILE_PATH" == */.git/* ]] || [[ "$FILE_PATH" == .git/* ]]; then
  echo "Blocked: '$FILE_PATH' is inside the .git directory. Never edit git internals directly." >&2
  exit 2
fi

exit 0
