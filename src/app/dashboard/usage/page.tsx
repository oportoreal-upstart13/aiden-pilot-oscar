import { redirect } from "next/navigation";
import {
  PageHeader,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from "@upstart13-com/aiden-ui";
import { auth } from "@/lib/auth";
import { getCurrentMembership } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Owner-only, org-scoped AI cost/usage view. */
export default async function UsagePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/usage");

  const membership = await getCurrentMembership(session.user.id);
  if (!membership || membership.role !== "owner") {
    redirect("/dashboard");
  }

  const usage = await prisma.aIUsage.findMany({
    where: { orgId: membership.orgId },
    orderBy: { createdAt: "desc" },
  });

  const totalCostUsd = usage.reduce((sum, row) => sum + Number(row.costUsd), 0);

  return (
    <div>
      <PageHeader
        title="AI usage"
        subtitle={`Cost and token spend for ${membership.org.name}'s AI calls.`}
      />
      <div className="space-y-8 px-6 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-5">
            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              Total spend
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">
              ${totalCostUsd.toFixed(4)}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              AI calls
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">
              {usage.length.toLocaleString("en-US")}
            </p>
          </Card>
        </div>

        {usage.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No AI calls recorded yet — draft a reply or create a ticket to
            see spend here.
          </p>
        ) : (
          <div className="border-border rounded-sm border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className="text-foreground font-semibold">
                    Route
                  </TableHead>
                  <TableHead className="text-foreground font-semibold">
                    Model
                  </TableHead>
                  <TableHead className="text-foreground text-right font-semibold">
                    Tokens
                  </TableHead>
                  <TableHead className="text-foreground text-right font-semibold">
                    Cost
                  </TableHead>
                  <TableHead className="text-foreground text-right font-semibold">
                    When
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">
                      {row.route}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.model}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(row.promptTokens + row.completionTokens).toLocaleString(
                        "en-US"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ${Number(row.costUsd).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {row.createdAt.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
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
