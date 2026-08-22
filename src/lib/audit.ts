import "server-only";
import { headers } from "next/headers";
import {
  createAuditReader,
  createPrismaAuditSink,
  setAuditSink,
} from "@upstart13-com/aiden-security";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { createFileAuditSink } from "@/lib/audit-sinks";
import { aidenConfig } from "@/../aiden.config";

/**
 * Wire the audit sink, chosen by `aiden.config.ts` → `audit.sink`.
 *
 * This is the whole swap: one flag decides which function is registered,
 * and no call site changes. `auditLog({ event, resourceId, metadata })`
 * in a route is byte-identical either way — the routes do not know a sink
 * exists.
 *
 * Imported from `src/lib/security.ts` (every API route) and from
 * `src/lib/auth.ts` (the NextAuth route, which never reaches security.ts),
 * not only from `instrumentation.ts`. Next bundles instrumentation into a
 * separate server chunk with its own module instance, so a sink
 * registered only there lands on an instance the handlers never resolve —
 * see `docs/ops-diagnosis.md` §5.
 *
 * `captureRequestMeta` reads from Next.js's per-request `headers()`
 * helper. It returns `{}` outside a request (e.g. background jobs)
 * because `headers()` throws there — the sink falls back to nulls.
 */

/**
 * Read the configured sink mode across a function boundary.
 *
 * `aiden.config.ts` closes with `as const`, so `audit.sink` has the
 * literal type of whichever value is written there today, and TypeScript
 * narrows a directly-assigned const to that same literal — it then reports
 * the other branch as an impossible comparison. The branch is not
 * impossible; it is unreachable *until someone flips the flag*, which is
 * the entire point of the flag.
 *
 * A declared return type states that honestly and is not narrowed at the
 * call site. A cast would also silence it, but a cast asserts something
 * about the value; this asserts something about when it is known. The
 * config literal stays free of casts either way, which matters because
 * the CLI parses that file (see `.claude/fixes/aiden-cli.md`).
 */
function auditSinkMode(): "prisma" | "file" {
  return aidenConfig.audit.sink;
}

setAuditSink(
  auditSinkMode() === "file"
    ? createFileAuditSink()
    : createPrismaAuditSink({
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

/** One audit row as the org-scoped viewer presents it. */
export interface OrgAuditEntry {
  id: string;
  event: string;
  actorId: string | null;
  resourceId: string | null;
  metadata: Prisma.JsonValue | null;
  requestId: string | null;
  timestamp: Date;
  /**
   * `"org"` — the row states which organization it belongs to.
   * `"actor"` — it does not, and is included only because its actor is a
   * member here. Exact for a single-org member; for someone who belongs
   * to several, a row raised while they acted elsewhere is
   * indistinguishable. Callers must surface this distinction rather than
   * presenting actor-attributed rows as org-scoped.
   */
  attribution: "org" | "actor";
}

/**
 * Read the audit trail for one organization.
 *
 * Shared by `GET /api/admin/audit` and the `/admin/audit` page so both
 * apply exactly the same criterion — the page previously called
 * `auditReader.list()` with no org scope at all, which was the same
 * cross-tenant leak as the route, in a second place.
 *
 * **Two queries, not one `OR`.** Domain events carry their organization
 * in `metadata.orgId`; denial and auth events are emitted from inside the
 * SDK with no `orgId` and can only be reached by actor. A single `OR`
 * forces the planner to combine a jsonb expression index with a btree via
 * BitmapOr, which it commonly discards for a sequential scan.
 *
 * `createAuditReader` cannot express either predicate — its filters are
 * `{ userId?, event?, from?, to? }` with no metadata hook — which is why
 * this goes through the Prisma client directly.
 *
 * `ipAddress` and `userAgent` are deliberately not selected: an
 * actor-attributed row may describe activity in another organization, and
 * there is no reason to widen that from "an event happened" to "here is
 * their IP address".
 */
export async function listOrgAuditEntries(
  orgId: string,
  limit: number
): Promise<OrgAuditEntry[]> {
  const members = await prisma.membership.findMany({
    where: { orgId },
    select: { userId: true },
  });
  const memberIds = members.map((row) => row.userId);

  const select = {
    id: true,
    event: true,
    actorId: true,
    resourceId: true,
    metadata: true,
    requestId: true,
    timestamp: true,
  };
  const orderBy = [{ timestamp: "desc" as const }, { id: "desc" as const }];

  const [domainRows, actorRows] = await Promise.all([
    prisma.auditLog.findMany({
      where: { metadata: { path: ["orgId"], equals: orgId } },
      orderBy,
      take: limit,
      select,
    }),
    memberIds.length === 0
      ? Promise.resolve([])
      : prisma.auditLog.findMany({
          where: { actorId: { in: memberIds } },
          orderBy,
          take: limit,
          select,
        }),
  ]);

  const orgAttributed = new Set(domainRows.map((row) => row.id));
  const merged = new Map<string, (typeof domainRows)[number]>();
  for (const row of [...domainRows, ...actorRows]) merged.set(row.id, row);

  return [...merged.values()]
    .sort(
      (a, b) =>
        b.timestamp.getTime() - a.timestamp.getTime() ||
        (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
    )
    .slice(0, limit)
    .map((row) => ({
      ...row,
      attribution: orgAttributed.has(row.id)
        ? ("org" as const)
        : ("actor" as const),
    }));
}
