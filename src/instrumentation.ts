/**
 * Next.js instrumentation hook — runs once per server runtime at boot.
 * Use it to register cross-cutting wiring like the audit sink before
 * any request handler runs.
 *
 * Both `nodejs` and `edge` runtimes call this; we only register the
 * Prisma audit sink on `nodejs` (Prisma + Node-only APIs).
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/audit");
  }
}
