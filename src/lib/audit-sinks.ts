import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import type { AuditSink } from "@upstart13-com/aiden-security";
import { log } from "@/lib/logger";

/**
 * Alternative audit sinks.
 *
 * `setAuditSink` takes any function matching the `AuditSink` contract, so
 * swapping where audit events go is a question of which function is
 * registered — not of editing any call site. `auditLog({ … })` in a route
 * is identical either way. `src/lib/audit.ts` picks between this and the
 * Prisma sink from one flag in `aiden.config.ts`.
 *
 * Worth being precise about what the swap does and does not cover: it
 * changes where events are **written**. The org-scoped viewer still reads
 * `prisma.auditLog`, so while the file sink is active the admin audit
 * page goes quiet — new events are landing somewhere it does not look.
 * That is the honest consequence of a write-side swap, and it is exactly
 * what the live demonstration shows.
 */

/** Default destination. Override with `AUDIT_LOG_FILE`. */
export const AUDIT_FILE_PATH = process.env.AUDIT_LOG_FILE ?? "logs/audit.ndjson";

/**
 * Newline-delimited JSON sink: one event per line, appended.
 *
 * NDJSON rather than a JSON array because an array has to be rewritten to
 * stay valid, and an append-only log that is rewritten on every write is
 * not append-only. One object per line survives truncation, tails cleanly,
 * and is what log rotation expects.
 *
 * **Never throws.** `auditLog()` is fire-and-forget — the SDK does not
 * await the sink and will not see a rejection — so a failure here that
 * escaped would be an unhandled rejection, and a silent one would lose
 * audit events with nothing to show for it. Every failure is logged
 * through the app logger instead.
 */
export function createFileAuditSink(filePath = AUDIT_FILE_PATH): AuditSink {
  const absolute = isAbsolute(filePath)
    ? filePath
    : resolve(process.cwd(), filePath);
  let directoryReady = false;

  return async (record) => {
    try {
      if (!directoryReady) {
        await mkdir(dirname(absolute), { recursive: true });
        directoryReady = true;
      }

      // The record arrives enriched — `timestamp`, `requestId` and
      // `userId` are already attached by auditLog(). It is written
      // verbatim: the sink's job is to persist the record, not to decide
      // what belongs in it. Metadata is already minimal by construction
      // (never bodies, never prompts) and redacting here would only put a
      // second opinion in the path.
      await appendFile(absolute, `${JSON.stringify(record)}\n`, "utf8");
    } catch (err: unknown) {
      log.error(
        { err, event: record.event, path: absolute },
        "failed to append audit event to the file sink"
      );
    }
  };
}
