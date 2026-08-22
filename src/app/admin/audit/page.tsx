import { redirect } from "next/navigation";
import { Info, Shield } from "lucide-react";
import {
  Badge,
  Card,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@upstart13-com/aiden-ui";
import { auth } from "@/lib/auth";
import { abilities } from "@/lib/abilities";
import { resolveActiveOrg } from "@/lib/org";
import { listOrgAuditEntries } from "@/lib/audit";
import { EmptyValue } from "@/components/tickets/ticket-badges";
import type { SecuritySession } from "@upstart13-com/aiden-security";

export const dynamic = "force-dynamic";

/**
 * Org-scoped audit viewer.
 *
 * Rewritten: the previous version called `auditReader.list({ limit: 100 })`
 * with no organization scope, gated only on the global `audit.read`
 * ability — the same cross-tenant leak that was closed in the API route,
 * in its second location. It now shares `listOrgAuditEntries` with the
 * route, so the two cannot diverge.
 */
export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/audit");

  const securitySession = session as unknown as SecuritySession;
  const membership = await resolveActiveOrg(session.user.id);
  if (!abilities.can(securitySession, "org.audit.read", membership)) {
    redirect("/dashboard");
  }

  const entries = await listOrgAuditEntries(membership.orgId, 100);
  const actorScoped = entries.filter(
    (entry) => entry.attribution === "actor"
  ).length;

  return (
    <div>
      <PageHeader
        title="Audit trail"
        subtitle="Domain events for this organization, plus sign-ins and denied attempts by its members."
      />

      <div className="space-y-8 px-6 py-8">
        <Card className="bg-muted/30 border-0 p-5 shadow-none">
          <div className="flex items-start gap-3">
            <Info
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
              strokeWidth={1.5}
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold">
                {actorScoped} of {entries.length} rows are attributed by actor,
                not by organization
              </p>
              <p className="text-muted-foreground text-sm">
                Sign-ins and denied attempts are emitted by the SDK without any
                organization on the row, so the only handle on them is who did
                it. For someone who belongs to one organization that is exact.
                For someone who belongs to several, an event raised while they
                were acting elsewhere appears here and cannot be told apart —
                the information needed to separate them is not in the row. Rows
                marked <Badge variant="outline">actor</Badge> carry that
                caveat; rows marked <Badge variant="secondary">org</Badge> state
                their organization themselves.
              </p>
            </div>
          </div>
        </Card>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted mb-4 rounded-sm p-3">
              <Shield
                className="text-muted-foreground size-6"
                strokeWidth={1.5}
              />
            </div>
            <h3 className="text-base font-semibold">No audit events yet</h3>
            <p className="text-muted-foreground mt-1 max-w-xs text-sm">
              Events appear here as members sign in, file tickets, and use AI.
            </p>
          </div>
        ) : (
          <div className="border-border overflow-x-auto rounded-sm border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className="text-foreground font-semibold">
                    Event
                  </TableHead>
                  <TableHead className="text-foreground font-semibold">
                    Attribution
                  </TableHead>
                  <TableHead className="text-foreground hidden font-semibold sm:table-cell">
                    Resource
                  </TableHead>
                  <TableHead className="text-foreground hidden font-semibold lg:table-cell">
                    Detail
                  </TableHead>
                  <TableHead className="text-foreground text-right font-semibold">
                    When
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm font-medium">
                      {entry.event}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry.attribution === "org" ? "secondary" : "outline"
                        }
                      >
                        {entry.attribution}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden max-w-[16rem] truncate font-mono text-sm sm:table-cell">
                      {entry.resourceId ?? <EmptyValue />}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-[22rem] truncate font-mono text-xs lg:table-cell">
                      {entry.metadata === null ? (
                        <EmptyValue />
                      ) : (
                        JSON.stringify(entry.metadata)
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-sm tabular-nums">
                      {entry.timestamp.toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
