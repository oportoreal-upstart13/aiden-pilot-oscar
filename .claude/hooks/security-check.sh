#!/bin/bash
# security-check.sh
# PostToolUse hook — fast security anti-pattern detection on .ts/.tsx files.
# Catches critical issues at write-time before they reach a PR.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check TypeScript files
if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi

# Skip generated files and node_modules
if [[ "$FILE_PATH" == */node_modules/* ]] || [[ "$FILE_PATH" == */generated/* ]] || [[ "$FILE_PATH" == */.next/* ]]; then
  exit 0
fi

# Don't block if the file doesn't exist (was deleted)
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

FILENAME=$(basename "$FILE_PATH")
FILE_CONTENT=$(cat "$FILE_PATH" 2>/dev/null || true)

if [ -z "$FILE_CONTENT" ]; then
  exit 0
fi

# ─── Check 1: Raw unsafe SQL (Prisma) ───────────────────────────────
if echo "$FILE_CONTENT" | grep -qE '\$executeRawUnsafe|\$queryRawUnsafe'; then
  echo "SECURITY VIOLATION: '$FILE_PATH' uses \$executeRawUnsafe or \$queryRawUnsafe. Use parameterized queries (\$executeRaw with template literals) instead. Raw unsafe queries are vulnerable to SQL injection." >&2
  exit 2
fi

# ─── Check 2: eval() usage ──────────────────────────────────────────
if echo "$FILE_CONTENT" | grep -qE '\beval\s*\(|new\s+Function\s*\('; then
  echo "SECURITY VIOLATION: '$FILE_PATH' uses eval() or new Function(). These enable arbitrary code execution. Refactor to avoid dynamic code evaluation." >&2
  exit 2
fi

# ─── Check 3: dangerouslySetInnerHTML ────────────────────────────────
if echo "$FILE_CONTENT" | grep -qE 'dangerouslySetInnerHTML'; then
  echo "SECURITY VIOLATION: '$FILE_PATH' uses dangerouslySetInnerHTML. This enables XSS attacks. Use a sanitization library (e.g. DOMPurify) or render content safely with React." >&2
  exit 2
fi

# ─── Check 4: Server modules in "use client" files ──────────────────
if echo "$FILE_CONTENT" | grep -qE '"use client"'; then
  if echo "$FILE_CONTENT" | grep -qE 'from\s+"@prisma/client"|from\s+"bcryptjs"|from\s+"stripe"|from\s+"@sendgrid/mail"|from\s+"node:fs"|from\s+"node:child_process"|from\s+"node:crypto"'; then
    echo "SECURITY VIOLATION: '$FILE_PATH' is a \"use client\" component that imports a server-only module (@prisma/client, bcryptjs, stripe, @sendgrid/mail, or Node.js builtins). Server modules must never be bundled into client code — they leak secrets and crash the browser." >&2
    exit 2
  fi
fi

# ─── Check 5: Hardcoded secrets ──────────────────────────────────────
if echo "$FILE_CONTENT" | grep -qE 'sk_live_[a-zA-Z0-9]+|sk_test_[a-zA-Z0-9]+|whsec_[a-zA-Z0-9]+|-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----'; then
  echo "SECURITY VIOLATION: '$FILE_PATH' contains a hardcoded secret (Stripe key, webhook secret, or private key). Use environment variables instead. Never commit secrets to source code." >&2
  exit 2
fi

# Also check for SendGrid API keys (SG. followed by base64-like string)
if echo "$FILE_CONTENT" | grep -qE '"SG\.[a-zA-Z0-9_-]{20,}"'; then
  echo "SECURITY VIOLATION: '$FILE_PATH' contains a hardcoded SendGrid API key. Use environment variables instead." >&2
  exit 2
fi

# ─── Check 6: Unprotected API routes (warning, not block) ───────────
# Only applies to route.ts files in src/app/api/
if [[ "$FILE_PATH" == */src/app/api/*/route.ts ]]; then
  if echo "$FILE_CONTENT" | grep -qE 'export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)'; then
    if ! echo "$FILE_CONTENT" | grep -qE 'auth\(|getServerSession|getSession'; then
      # Warn but don't block — some routes (webhooks, public endpoints) legitimately skip auth
      echo "SECURITY WARNING: '$FILE_PATH' defines API route handlers but does not appear to call auth(). If this route requires authentication, add an auth() check. If it's intentionally public (e.g., a webhook), this warning can be ignored."
    fi
  fi
fi

exit 0
