import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import {
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
import { prisma } from "@/lib/prisma";
import { abilities } from "@/lib/abilities";
import { resolveActiveOrg } from "@/lib/org";
import { EmptyValue } from "@/components/tickets/ticket-badges";
import type { SecuritySession } from "@upstart13-com/aiden-security";

export const dynamic = "force-dynamic";

const usd = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const count = new Intl.NumberFormat();

/**
 * AI spend for the active organization, broken down per user.
 *
 * Totals are aggregated in the database rather than summed from the
 * truncated recent-calls list, so they stay correct however that list is
 * bounded. `costUsd` is a `Decimal(10,6)` and arrives as a
 * `Prisma.Decimal`, which does not round-trip through JSON — every one is
 * converted with `Number(...)` before it is formatted.
 */
export default async function AdminCostPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/cost");

  const securitySession = session as unknown as SecuritySession;
  const membership = await resolveActiveOrg(session.user.id);
  if (!abilities.can(securitySession, "org.usage.read", membership)) {
    redirect("/dashboard");
  }

  const where = { orgId: membership.orgId };

  const [total, perUser, recent] = await Promise.all([
    prisma.aIUsage.aggregate({
      where,
      _count: { _all: true },
      _sum: { promptTokens: true, completionTokens: true, costUsd: true },
    }),
    prisma.aIUsage.groupBy({
      by: ["userId"],
      where,
      _count: { _all: true },
      _sum: { costUsd: true },
    }),
    prisma.aIUsage.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 25,
      select: {
        id: true,
        route: true,
        model: true,
        promptTokens: true,
        completionTokens: true,
        costUsd: true,
        createdAt: true,
      },
    }),
  ]);

  const users = await prisma.user.findMany({
    where: { id: { in: perUser.map((row) => row.userId) } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((user) => [user.id, user]));

  const breakdown = perUser
    .map((row) => ({
      userId: row.userId,
      label: byId.get(row.userId)?.name ?? byId.get(row.userId)?.email ?? null,
      calls: row._count._all,
      costUsd: Number(row._sum.costUsd ?? 0),
    }))
    .sort((a, b) => b.costUsd - a.costUsd);

  const totalCost = Number(total._sum.costUsd ?? 0);
  const totalCalls = total._count._all;

  return (
    <div>
      <PageHeader
        title="AI spend"
        subtitle="What this organization has spent on AI, and who spent it."
      />

      <div className="space-y-8 px-6 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">
            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              Total spend
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">
              {usd.format(totalCost)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Provider-reported, not estimated
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              Calls
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">
              {count.format(totalCalls)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Triage and drafts combined
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              Prompt tokens
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">
              {count.format(total._sum.promptTokens ?? 0)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">Sent to the provider</p>
          </Card>
          <Card className="p-5">
            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              Completion tokens
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">
              {count.format(total._sum.completionTokens ?? 0)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">Generated</p>
          </Card>
        </div>

        {totalCalls === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted mb-4 rounded-sm p-3">
              <Receipt
                className="text-muted-foreground size-6"
                strokeWidth={1.5}
              />
            </div>
            <h3 className="text-base font-semibold">No AI spend yet</h3>
            <p className="text-muted-foreground mt-1 max-w-xs text-sm">
              Rows appear here when someone files a ticket or drafts a reply.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">By member</h2>
              <div className="border-border overflow-x-auto rounded-sm border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="text-foreground font-semibold">
                        Member
                      </TableHead>
                      <TableHead className="text-foreground text-right font-semibold">
                        Calls
                      </TableHead>
                      <TableHead className="text-foreground text-right font-semibold">
                        Spend
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdown.map((row) => (
                      <TableRow key={row.userId} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {row.label ?? <EmptyValue />}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {count.format(row.calls)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {usd.format(row.costUsd)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Recent calls</h2>
              <div className="border-border overflow-x-auto rounded-sm border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="text-foreground font-semibold">
                        Route
                      </TableHead>
                      <TableHead className="text-foreground hidden font-semibold sm:table-cell">
                        Model
                      </TableHead>
                      <TableHead className="text-foreground hidden text-right font-semibold md:table-cell">
                        Tokens
                      </TableHead>
                      <TableHead className="text-foreground text-right font-semibold">
                        Cost
                      </TableHead>
                      <TableHead className="text-foreground hidden text-right font-semibold lg:table-cell">
                        When
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">
                          {row.route}
                        </TableCell>
                        <TableCell className="hidden font-mono text-sm sm:table-cell">
                          {row.model}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden text-right text-sm tabular-nums md:table-cell">
                          {count.format(row.promptTokens)} /{" "}
                          {count.format(row.completionTokens)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {usd.format(Number(row.costUsd))}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden text-right text-sm tabular-nums lg:table-cell">
                          {row.createdAt.toLocaleString(undefined, {
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
