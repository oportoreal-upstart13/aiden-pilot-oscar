import "server-only";
import { headers } from "next/headers";
import {
  createAuditReader,
  createPrismaAuditSink,
  setAuditSink,
} from "@upstart13-com/aiden-security";
import { prisma } from "@/lib/prisma";

/**
 * Wire the Prisma-backed audit sink. Imported once from
 * `instrumentation.ts` so audit events from `aiden-auth` (sign-in,
 * sign-out, register) and `aiden-security` (ownership / ability
 * failures) land in the `audit_logs` table.
 *
 * `captureRequestMeta` reads from Next.js's per-request `headers()`
 * helper. It returns `{}` outside a request (e.g. background jobs)
 * because `headers()` throws there — the sink falls back to nulls.
 */
setAuditSink(
  createPrismaAuditSink({
    prisma,
    captureRequestMeta: () => {
      try {
        const h = headers() as unknown as Headers;
        return {
          ipAddress:
            h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            h.get("x-real-ip") ??
            null,
          userAgent: h.get("user-agent") ?? null,
        };
      } catch {
        return {};
      }
    },
  })
);

export const auditReader = createAuditReader({ prisma });
