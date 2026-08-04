import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, Mail } from "lucide-react";
import {
  PageHeader,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@upstart13-com/aiden-ui";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/org";
import { getVisibleTicketsWhere } from "@/lib/tickets";
import { NewTicketDialog } from "@/components/tickets/new-ticket-dialog";
import {
  TicketStatusBadge,
  TicketPriorityBadge,
} from "@/components/tickets/ticket-badges";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/tickets");

  const membership = await getCurrentMembership(session.user.id);

  if (!membership) {
    return (
      <div>
        <PageHeader
          title="Tickets"
          subtitle="Your organization's shared support inbox."
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-muted mb-4 rounded-sm p-3">
            <Inbox className="text-muted-foreground size-6" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold">
            You haven&apos;t been added to an organization yet
          </h3>
          <p className="text-muted-foreground mt-1 max-w-xs text-sm">
            Ask an org owner to add you by email from their Members page
            before you can see or file tickets.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <a href="mailto:support@example.com">
              <Mail className="mr-2 size-4" strokeWidth={1.5} />
              Contact support
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const canCreate = membership.role === "agent";

  const tickets = await prisma.ticket.findMany({
    where: getVisibleTicketsWhere(membership),
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true, email: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Tickets"
        subtitle={
          canCreate
            ? `Tickets you own in ${membership.org.name}.`
            : `All tickets in ${membership.org.name} (read-only).`
        }
        action={canCreate ? <NewTicketDialog /> : undefined}
      />
      <div className="space-y-8 px-6 py-8">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="border-border mb-6 rounded-sm border border-dashed p-6">
              <Inbox className="text-muted-foreground size-8" strokeWidth={1} />
            </div>
            <h3 className="text-lg font-semibold">No tickets yet</h3>
            <p className="text-muted-foreground mt-2 max-w-sm text-sm">
              {canCreate
                ? "Create your first ticket to get started."
                : "Tickets filed by your organization will show up here."}
            </p>
            {canCreate ? (
              <div className="mt-6">
                <NewTicketDialog />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="border-border rounded-sm border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className="text-foreground font-semibold">
                    Subject
                  </TableHead>
                  <TableHead className="text-foreground font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-foreground font-semibold">
                    Priority
                  </TableHead>
                  <TableHead className="text-foreground font-semibold">
                    Owner
                  </TableHead>
                  <TableHead className="text-foreground text-right font-semibold">
                    Updated
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/tickets/${ticket.id}`}
                        className="hover:underline"
                      >
                        {ticket.subject}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <TicketStatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      {ticket.priority ? (
                        <TicketPriorityBadge priority={ticket.priority} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ticket.owner.name ?? ticket.owner.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {ticket.updatedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
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
