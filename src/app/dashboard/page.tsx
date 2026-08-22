import { redirect } from "next/navigation";
import { PageHeader } from "@upstart13-com/aiden-ui";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveOrg } from "@/lib/org";
import { orgTicketsWhere } from "@/lib/tickets";
import { NewTicketDialog } from "@/components/tickets/new-ticket-dialog";
import { TicketsTable } from "@/components/tickets/tickets-table";

export const dynamic = "force-dynamic";

/**
 * The ticket queue for the caller's active organization.
 *
 * Reads through `resolveActiveOrg` and `orgTicketsWhere` — the same
 * helpers the API routes use — rather than fetching its own API. One
 * tenant boundary, one ownership rule, applied identically whether the
 * caller arrives through a page or a route.
 */
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  const membership = await resolveActiveOrg(session.user.id);
  const isAgent = membership.role === "agent";

  const tickets = await prisma.ticket.findMany({
    where: orgTicketsWhere(membership, session.user.id),
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 50,
    select: {
      id: true,
      subject: true,
      status: true,
      priority: true,
      category: true,
      updatedAt: true,
    },
  });

  const scopeLabel = isAgent
    ? "You are seeing the tickets you own."
    : "You are seeing every ticket in this organization.";

  return (
    <div>
      <PageHeader
        title="Tickets"
        subtitle={scopeLabel}
        action={isAgent ? <NewTicketDialog /> : undefined}
      />
      <div className="space-y-8 px-6 py-8">
        <TicketsTable tickets={tickets} scopeLabel={scopeLabel} />
      </div>
    </div>
  );
}
