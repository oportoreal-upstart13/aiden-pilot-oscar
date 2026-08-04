#!/bin/bash
# inject-compact-context.sh
# Re-injects critical project rules into Claude's context after compaction.
# Output goes to stdout and is added directly to Claude's context window.

BRANCH=$(git -C "$CLAUDE_PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
RECENT_LOG=$(git -C "$CLAUDE_PROJECT_DIR" log --oneline -3 2>/dev/null || echo "(no commits)")

cat << EOF
=== CONTEXT RESTORED AFTER COMPACTION ===

Project: u13-ai-foundation
Stack: Next.js 16 (App Router) · TypeScript 5 · NextAuth v5 · Prisma + PostgreSQL · Stripe · SendGrid · shadcn/ui · Tailwind CSS v4
Package manager: npm (never pnpm or bun)
Path alias: @/* → src/*
Current branch: $BRANCH

Recent commits:
$RECENT_LOG

── CRITICAL RULES ──────────────────────────────────────────────────────────────

CODE STYLE
- Double quotes, not single quotes
- Named exports only — NEVER default exports (except Next.js route files: page.tsx, layout.tsx, route.ts, error.tsx, loading.tsx)
- Use "type" imports for type-only imports
- Files: kebab-case.ts — routes follow App Router conventions
- Prefix unused params with _

UI / DESIGN SYSTEM (read docs/design-system/ before ANY UI work)
- NEVER hardcode colors — use CSS variable tokens: bg-background, text-foreground, text-muted-foreground, bg-primary, bg-accent, bg-destructive, border-border
- NEVER use bg-gray-*, text-zinc-*, border-slate-* — semantic tokens only
- NEVER use rounded-lg, rounded-xl, rounded-2xl — use rounded-sm (4px). Avatars only: rounded-full
- shadcn/ui is the component library — always use it before building custom components
- Lucide icons only — strokeWidth={1.5}, default size-4
- Every page needs a header: border-b border-border px-6 py-5
- One primary CTA per section — everything else is secondary or ghost
- Mobile + tablet + desktop responsive required

ARCHITECTURE
- Auth: NextAuth v5 · src/lib/auth.ts · custom pages at /login
- Database: Prisma + PostgreSQL · client: src/lib/prisma.ts · schema: prisma/schema.prisma
- NEVER import Prisma client in browser code
- Payments: Stripe · src/lib/stripe.ts · server-side only
- API routes: src/app/api/ · return NextResponse.json()
- AI providers: use Context7 MCP before writing any AI integration code

LIBRARY DOCS
- Use Context7 MCP (resolve-library-id → query-docs) before writing code for any external library
- Google GenAI: import { GoogleGenAI, Type } from "@google/genai" (NOT @google/generative-ai)

VERIFICATION (run after every change)
- npm run lint
- npx tsc --noEmit

PROGRESS LOG
- Append to .claude/progress.log after every task
- Format: [YYYY-MM-DD HH:MM] STATUS type(scope): description — outcome

=== END CONTEXT RESTORE ===
EOF
