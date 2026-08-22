import { NextResponse } from "next/server";
import { assertCan, parseQuery } from "@/lib/security";
import { withAuthRoute } from "@/lib/routes";
import { abilities } from "@/lib/abilities";
import { resolveActiveOrg } from "@/lib/org";
import { listOrgAuditEntries } from "@/lib/audit";
import { ListAuditQuery } from "@/lib/validations/orgs";

/**
 * Org-scoped audit viewer.
 *
 * This replaced a route that called `auditReader.list()` with no org
 * scope at all — a cross-tenant audit leak that shipped in the starter.
 *
 * The two-query criterion lives in `listOrgAuditEntries`
 * (`src/lib/audit.ts`) so this route and the `/admin/audit` page cannot
 * drift: the page had the identical leak, in a second location, and both
 * are now fed by one implementation. See that function for why it is two
 * queries rather than an `OR`, which index serves each, and why
 * `ipAddress`/`userAgent` are withheld.
 *
 * The response never explains a denial. `security.ability_denied` carries
 * `actorRoles`, but those are NextAuth's **global** roles, not the org
 * role that decided — a viewer denied `ticket.draft` shows `["member"]`,
 * which had no part in it. Metadata is passed through verbatim because it
 * is the record; nothing labels it as the reason, and the UI must not
 * either.
 */
export const GET = withAuthRoute(async (req, { session }) => {
  const query = parseQuery(req, ListAuditQuery);
  const membership = await resolveActiveOrg(session.user.id);
  assertCan(abilities, session, "org.audit.read", membership);

  const entries = await listOrgAuditEntries(membership.orgId, query.limit);

  return NextResponse.json({ orgId: membership.orgId, entries });
});
