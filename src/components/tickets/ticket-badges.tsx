import { Badge } from "@upstart13-com/aiden-ui";

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  pending: "Pending",
  closed: "Closed",
};

const STATUS_VARIANT: Record<
  string,
  "info" | "warning" | "secondary"
> = {
  open: "info",
  pending: "warning",
  closed: "secondary",
};

export function TicketStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"} className="gap-1.5">
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const PRIORITY_VARIANT: Record<string, "outline" | "warning" | "error"> = {
  low: "outline",
  medium: "warning",
  high: "error",
};

export function TicketPriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority] ?? "outline"}>{priority}</Badge>
  );
}
