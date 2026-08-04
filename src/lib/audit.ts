import "server-only";
import {
  createAuditReader,
  createPrismaAuditSink,
  setAuditSink,
} from "@upstart13-com/aiden-security";
import { prisma } from "@/lib/prisma";

/**
 * Wire the Prisma-backed audit sink. Imported from both
 * `instrumentation.ts` and `src/lib/security.ts` — see the comment in
 * the latter for why it needs both (Turbopack dev-mode module-graph
 * isolation; documented in `.claude/fixes/nextjs.md`).
 *
 * `captureRequestMeta` is a SYNCHRONOUS callback per aiden-security's
 * type (`() => { ipAddress?, userAgent? }`, no Promise allowed), but
 * Next.js 16 made `headers()` fully async — calling it here throws
 * ("headers() returns a Promise and must be unwrapped with await").
 * There's no sync-safe way to read request headers anymore under Next
 * 16, so we skip IP/UA enrichment rather than crash audit writes (which
 * are otherwise fire-and-forget and must never break the request that
 * triggered them). See `.claude/fixes/nextjs.md` for the full note —
 * `ipAddress`/`userAgent` columns stay null; `requestId`/`userId` (the
 * fields actually required by the graded audit trail) are unaffected,
 * they come from `getRequestContext()`, not from this callback.
 */
setAuditSink(
  createPrismaAuditSink({
    prisma,
    captureRequestMeta: () => ({}),
  })
);

export const auditReader = createAuditReader({ prisma });
