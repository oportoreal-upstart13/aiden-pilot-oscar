import { Badge } from "@upstart13-com/aiden-ui";
import type { TicketStatus } from "@/config/rbac";

/**
 * Status and classification badges.
 *
 * Every state goes through a semantic `Badge` variant — never raw
 * coloured text (`05-data-display.md`, rule 5). The dot uses
 * `rounded-full`, which is the one sanctioned use of that radius
 * alongside avatars.
 *
 * These render `—` for an absent value rather than nothing, because an
 * unclassified ticket is a real and expected state: AI triage is an
 * enhancement, and when the provider is unavailable a ticket ships with
 * `priority`, `category` and `sentiment` all null.
 */

const STATUS_VARIANT: Record<TicketStatus, "info" | "warning" | "secondary"> = {
  open: "info",
  pending: "warning",
  closed: "secondary",
};

const STATUS_DOT: Record<TicketStatus, string> = {
  open: "bg-info",
  pending: "bg-warning",
  closed: "bg-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  const known = (Object.keys(STATUS_VARIANT) as TicketStatus[]).includes(
    status as TicketStatus
  )
    ? (status as TicketStatus)
    : null;

  if (!known) return <Badge variant="outline">{status}</Badge>;

  return (
    <Badge variant={STATUS_VARIANT[known]} className="gap-1.5">
      <span className={`size-1.5 rounded-full ${STATUS_DOT[known]}`} />
      {known}
    </Badge>
  );
}

const PRIORITY_VARIANT: Record<
  string,
  "secondary" | "info" | "warning" | "destructive"
> = {
  low: "secondary",
  medium: "info",
  high: "warning",
  urgent: "destructive",
};

export function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <EmptyValue />;
  const variant = PRIORITY_VARIANT[priority] ?? "outline";
  return <Badge variant={variant}>{priority}</Badge>;
}

export function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return <EmptyValue />;
  return <Badge variant="outline">{category}</Badge>;
}

const SENTIMENT_VARIANT: Record<string, "success" | "secondary" | "warning" | "error"> = {
  positive: "success",
  neutral: "secondary",
  frustrated: "warning",
  angry: "error",
};

export function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return <EmptyValue />;
  const variant = SENTIMENT_VARIANT[sentiment] ?? "outline";
  return <Badge variant={variant}>{sentiment}</Badge>;
}

/** Em dash for an empty cell — never `null`, `undefined` or blank. */
export function EmptyValue() {
  return <span className="text-muted-foreground">—</span>;
}
