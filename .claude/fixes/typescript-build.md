# TypeScript & Build Fixes

- **[2026-02-10]** `@hookform/resolvers/zod` zodResolver incompatible with Zod v4 → Resolved: `@hookform/resolvers` must be `^5.2.2` or later which supports Zod v4 natively. If upgrading Zod, upgrade this package too.
- **[2026-02-10]** Used deprecated `@google/generative-ai` SDK instead of current `@google/genai` → Always use `import { GoogleGenAI, Type } from "@google/genai"`. The Context7 MCP rule in CLAUDE.md prevents recurrence.
- **[2026-02-10]** `[STRUCTURALLY PREVENTED]` Named export rule violation — default exports cause tree-shaking issues and import ambiguity in Next.js App Router → ESLint rule `import/no-default-export` in `eslint.config.mjs` enforces named exports. App Router convention files (`page.tsx`, `layout.tsx`, `route.ts`, etc.) and project config files are exempt.
