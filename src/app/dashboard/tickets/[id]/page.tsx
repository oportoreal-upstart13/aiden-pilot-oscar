import { notFound, redirect } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@upstart13-com/aiden-ui";
import { OwnershipError } from "@/lib/security";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveOrg } from "@/lib/org";
import {
  assertTicketOwnership,
  orgTicketsWhere,
  ticketDetailSelect,
} from "@/lib/tickets";
import {
  CategoryBadge,
  PriorityBadge,
  SentimentBadge,
  StatusBadge,
} from "@/components/tickets/ticket-badges";
import { DraftPanel } from "@/components/tickets/draft-panel";

export const dynamic = "force-dynamic";

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Ticket detail.
 *
 * Runs the same two-step scoping the API does: an org-filtered read, then
 * `assertTicketOwnership`. A cross-tenant or missing id arrives as `null`
 * and becomes Next's 404 — the page never distinguishes "does not exist"
 * from "not yours", exactly as the routes do not.
 *
 * `08-page-layouts.md` has this one case inline the header wrapper rather
 * than use `PageHeader`, because a detail page needs a breadcrumb above
 * the title and `PageHeader` has no breadcrumb slot. The wrapper matches
 * the same `border-b border-border px-6 py-5` contract.
 */
export default async function TicketDetailPage({
  params,
}: TicketDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  const { id } = await params;
  const membership = await resolveActiveOrg(session.user.id);

  const ticket = await prisma.ticket.findFirst({
    where: { ...orgTicketsWhere(membership, session.user.id), id },
    select: ticketDetailSelect,
  });

  try {
    assertTicketOwnership(ticket, membership, session.user.id);
  } catch (err: unknown) {
    if (err instanceof OwnershipError) notFound();
    throw err;
  }

  return (
    <div>
      <div className="border-border border-b px-6 py-5">
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Tickets</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{ticket.subject}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">
              {ticket.subject}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm tabular-nums">
              Opened{" "}
              {ticket.createdAt.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>
      </div>

      <div className="space-y-8 px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer message</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                  {ticket.body}
                </p>
              </CardContent>
            </Card>

            <DraftPanel
              ticketId={ticket.id}
              canDraft={membership.role === "agent"}
            />
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Classification</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground w-28 shrink-0 text-sm">
                    Priority
                  </dt>
                  <dd className="text-right">
                    <PriorityBadge priority={ticket.priority} />
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground w-28 shrink-0 text-sm">
                    Category
                  </dt>
                  <dd className="text-right">
                    <CategoryBadge category={ticket.category} />
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground w-28 shrink-0 text-sm">
                    Sentiment
                  </dt>
                  <dd className="text-right">
                    <SentimentBadge sentiment={ticket.sentiment} />
                  </dd>
                </div>
              </dl>
              {ticket.priority === null ? (
                <p className="text-muted-foreground mt-4 text-xs">
                  Filed unclassified — AI was unavailable when this ticket was
                  created. Editing the subject or body re-runs triage.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
