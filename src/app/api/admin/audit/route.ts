import { NextResponse } from "next/server";
import { assertCan, parseQuery } from "@/lib/security";
import { withAuthRoute } from "@/lib/routes";
import { abilities } from "@/lib/abilities";
import { prisma } from "@/lib/prisma";
import { resolveActiveOrg } from "@/lib/org";
import { ListAuditQuery } from "@/lib/validations/orgs";

/**
 * Org-scoped audit viewer.
 *
 * This replaces a route that called `auditReader.list()` with no org
 * scope at all — a cross-tenant audit leak that shipped in the starter.
 * `createAuditReader`'s filters are `{ userId?, event?, from?, to? }`
 * with no metadata hook, so it cannot express either predicate below;
 * the viewer queries `prisma.auditLog` directly and the missing filter is
 * raised upstream.
 *
 * **Two queries, deliberately, not one `OR`.** Domain events carry their
 * organization in `metadata.orgId`; denial and auth events are emitted
 * from inside the SDK with fixed metadata that has no `orgId` at all, and
 * can only be reached by actor. Expressed as a single `OR`, the planner
 * has to combine a jsonb expression index with a btree via BitmapOr and
 * commonly discards both in favour of a sequential scan — so the query
 * meant to demonstrate index use would demonstrate the opposite. Two
 * queries each hit their own index; the merge happens here.
 *
 *   A — `metadata.orgId = activeOrgId`, served by
 *       `audit_logs_metadata_org_id_idx`
 *   B — `actorId IN (the org's member ids)`
 *
 * Measured, not assumed (docs/evidence/audit-index-2026-08-21.txt): with
 * `enable_seqscan off`, A resolves to an Index Scan on
 * `audit_logs_metadata_org_id_idx` with the predicate as an **Index
 * Cond**. B does not use `audit_logs_actor_id_idx` — the planner walks
 * `audit_logs_timestamp_idx` backward to satisfy
 * `ORDER BY timestamp DESC LIMIT n` and applies the actor set as a
 * Filter. That is a reasonable plan for an ordered, limited read, but it
 * means B's cost grows with the table rather than with the caller's
 * organization. Serving it by index would need a composite
 * `(actor_id, timestamp)`, which is deliberately not added here.
 *
 * **What the `attribution` field means, and why the UI must respect it.**
 * `"org"` means the row states which organization it belongs to. `"actor"`
 * means it does not, and is included only because its actor is a member
 * here. For a member of one organization that inference is exact; for the
 * seeded dual-membership consultant it is not — a denial raised while
 * acting in another organization appears here, indistinguishable. The
 * information needed to separate them does not exist in the row.
 *
 * The response also refuses to explain denials. `security.ability_denied`
 * carries `actorRoles`, but those are NextAuth's **global** roles, not the
 * org role that actually decided — a viewer denied `ticket.draft` shows
 * `["member"]`, which had no part in it. The metadata is passed through
 * verbatim because it is the record, but nothing here labels it as the
 * reason, and the UI must not either.
 *
 * `ipAddress` and `userAgent` are deliberately not returned. They are on
 * the row, but an actor-attributed row may belong to another
 * organization's activity, and there is no reason to widen that leak from
 * "an event happened" to "here is their IP address".
 */
export const GET = withAuthRoute(async (req, { session }) => {
  const query = parseQuery(req, ListAuditQuery);
  const membership = await resolveActiveOrg(session.user.id);
  assertCan(abilities, session, "org.audit.read", membership);

  // Predicate B's inputs, org-filtered, so that side stays tenant-bound.
  const members = await prisma.membership.findMany({
    where: { orgId: membership.orgId },
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
      where: { metadata: { path: ["orgId"], equals: membership.orgId } },
      orderBy,
      take: query.limit,
      select,
    }),
    memberIds.length === 0
      ? Promise.resolve([])
      : prisma.auditLog.findMany({
          where: { actorId: { in: memberIds } },
          orderBy,
          take: query.limit,
          select,
        }),
  ]);

  const orgAttributed = new Set(domainRows.map((row) => row.id));
  const merged = new Map<string, (typeof domainRows)[number]>();
  for (const row of [...domainRows, ...actorRows]) merged.set(row.id, row);

  const entries = [...merged.values()]
    .sort(
      (a, b) =>
        b.timestamp.getTime() - a.timestamp.getTime() ||
        (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
    )
    .slice(0, query.limit)
    .map((row) => ({
      ...row,
      attribution: orgAttributed.has(row.id) ? "org" : "actor",
    }));

  return NextResponse.json({ orgId: membership.orgId, entries });
});
