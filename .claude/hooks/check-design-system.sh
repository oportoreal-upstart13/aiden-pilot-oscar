#!/bin/bash
# check-design-system.sh
# Validates design system rules after Claude edits a .tsx or .jsx file.
# Outputs a structured JSON block decision if violations are found,
# giving Claude feedback to fix them before continuing.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only run on UI component files
if ! echo "$FILE_PATH" | grep -qE '\.(tsx|jsx)$'; then
  exit 0
fi

# Resolve to absolute path
if [[ "$FILE_PATH" == /* ]]; then
  FULL_PATH="$FILE_PATH"
else
  FULL_PATH="${CLAUDE_PROJECT_DIR}/${FILE_PATH}"
fi

if [ ! -f "$FULL_PATH" ]; then
  exit 0
fi

FILENAME=$(basename "$FILE_PATH")
VIOLATIONS=""

# ── Rule 1: Hardcoded Tailwind color scales ──────────────────────────────────
# Flags uses like bg-gray-500, text-zinc-400, border-slate-200, etc.
# These must be replaced with CSS variable tokens from the design system.
COLORS=$(grep -nE '\b(bg|text|border|ring|outline|fill|stroke)-(gray|zinc|slate|stone|neutral|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]+\b' "$FULL_PATH" 2>/dev/null \
  | grep -v '^\s*//' \
  | head -3 || true)

if [ -n "$COLORS" ]; then
  VIOLATIONS="${VIOLATIONS}HARDCODED COLORS — use CSS variable tokens instead:\n${COLORS}\nExamples: bg-background, text-foreground, text-muted-foreground, bg-primary, bg-destructive, border-border, bg-accent\n\n"
fi

# ── Rule 2: Large border radius ───────────────────────────────────────────────
# CLAUDE.md: default is rounded-sm (4px). Only Avatar uses rounded-full.
ROUNDED=$(grep -nE '\brounded-(lg|xl|2xl|3xl)\b' "$FULL_PATH" 2>/dev/null \
  | grep -v '^\s*//' \
  | head -3 || true)

if [ -n "$ROUNDED" ]; then
  VIOLATIONS="${VIOLATIONS}LARGE BORDER RADIUS — use rounded-sm (4px) by default:\n${ROUNDED}\nOnly avatars get rounded-full. Remove rounded-lg, rounded-xl, rounded-2xl, rounded-3xl.\n\n"
fi

# ── Rule 3: Default exports (non-route files) ─────────────────────────────────
# CLAUDE.md: named exports only. Next.js route files are the exception.
ROUTE_FILES=("page.tsx" "layout.tsx" "route.ts" "error.tsx" "loading.tsx" "not-found.tsx" "template.tsx" "global-error.tsx")
IS_ROUTE_FILE=false
for rf in "${ROUTE_FILES[@]}"; do
  if [ "$FILENAME" = "$rf" ]; then
    IS_ROUTE_FILE=true
    break
  fi
done

if [ "$IS_ROUTE_FILE" = false ]; then
  DEFAULT_EXPORT=$(grep -nE '^export default ' "$FULL_PATH" 2>/dev/null | head -2 || true)
  if [ -n "$DEFAULT_EXPORT" ]; then
    VIOLATIONS="${VIOLATIONS}DEFAULT EXPORT — named exports only per CLAUDE.md:\n${DEFAULT_EXPORT}\nChange to: export function MyComponent() or export const MyComponent = ...\n\n"
  fi
fi

# ── Report ────────────────────────────────────────────────────────────────────
if [ -n "$VIOLATIONS" ]; then
  REASON="Design system violations in ${FILE_PATH}:\n\n${VIOLATIONS}Fix these before continuing. See docs/design-system/ for full rules."
  # Use jq to safely build the JSON with proper escaping
  echo "$REASON" | jq -Rs '{"decision": "block", "reason": .}'
fi

exit 0
