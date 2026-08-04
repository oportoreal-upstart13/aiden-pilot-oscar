import { notFound, redirect } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Badge,
} from "@upstart13-com/aiden-ui";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/org";
import {
  TicketStatusBadge,
  TicketPriorityBadge,
} from "@/components/tickets/ticket-badges";
import { TicketDetailPanel } from "@/components/tickets/ticket-detail-panel";

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({
  params,
}: TicketDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/dashboard/tickets/${id}`);
  }

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) redirect("/dashboard/tickets");

  const ticket = await prisma.ticket.findFirst({
    where: { id, orgId: membership.orgId },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  // Agent visibility is ownership-scoped — a ticket that exists in their
  // org but isn't theirs must 404, same as the API route. Owner/Viewer
  // have no such restriction (broad read visibility).
  if (!ticket || (membership.role === "agent" && ticket.ownerId !== session.user.id)) {
    notFound();
  }

  const canManage =
    membership.role === "agent" && ticket.ownerId === session.user.id;

  return (
    <div>
      <div className="border-border border-b px-6 py-5">
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/tickets">
                Tickets
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{ticket.subject}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {ticket.subject}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Filed by {ticket.owner.name ?? ticket.owner.email} ·{" "}
              {ticket.createdAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {ticket.priority ? (
              <TicketPriorityBadge priority={ticket.priority} />
            ) : null}
            <TicketStatusBadge status={ticket.status} />
          </div>
        </div>
        {ticket.category || ticket.sentiment ? (
          <div className="mt-3 flex items-center gap-2">
            {ticket.category ? (
              <Badge variant="outline">{ticket.category}</Badge>
            ) : null}
            {ticket.sentiment ? (
              <Badge variant="secondary">{ticket.sentiment}</Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-8 px-6 py-8">
        <TicketDetailPanel
          ticketId={ticket.id}
          body={ticket.body}
          status={ticket.status}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
