import Link from "next/link";
import { Inbox } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@upstart13-com/aiden-ui";
import {
  CategoryBadge,
  PriorityBadge,
  StatusBadge,
} from "@/components/tickets/ticket-badges";

export interface TicketRow {
  id: string;
  subject: string;
  status: string;
  priority: string | null;
  category: string | null;
  updatedAt: Date;
}

interface TicketsTableProps {
  tickets: TicketRow[];
  /** Agents see only their own tickets; owners and viewers see the org's. */
  scopeLabel: string;
}

export function TicketsTable({ tickets, scopeLabel }: TicketsTableProps) {
  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-muted mb-4 rounded-sm p-3">
          <Inbox className="text-muted-foreground size-6" strokeWidth={1.5} />
        </div>
        <h3 className="text-base font-semibold">No tickets yet</h3>
        <p className="text-muted-foreground mt-1 max-w-xs text-sm">
          {scopeLabel} Nothing has been filed here, so there is nothing to
          triage.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border overflow-x-auto rounded-sm border">
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
            <TableHead className="text-foreground hidden font-semibold sm:table-cell">
              Category
            </TableHead>
            <TableHead className="text-foreground hidden text-right font-semibold md:table-cell">
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
                <StatusBadge status={ticket.status} />
              </TableCell>
              <TableCell>
                <PriorityBadge priority={ticket.priority} />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <CategoryBadge category={ticket.category} />
              </TableCell>
              <TableCell className="text-muted-foreground hidden text-right text-sm tabular-nums md:table-cell">
                {ticket.updatedAt.toLocaleDateString(undefined, {
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
  );
}
