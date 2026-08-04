import "server-only";
import { defineAbilities } from "@upstart13-com/aiden-security";
import { ROLES } from "@/config/rbac";
import type { OrgRole } from "@/lib/org";

/**
 * App-wide RBAC rules. Add new actions here; pair role-based rules
 * (`{ roles: [...] }`) with predicate rules (`(session, resource) => boolean`)
 * for resource-level checks.
 *
 * Role and permission strings come from `@/config/rbac` — the single
 * source of truth shared with `prisma/seed.ts` — so renaming a role
 * touches one place and is checked at compile time.
 */
const ADMIN = ROLES.find((r) => r.name === "admin")!.name;

/** Type guard: does the untyped `resource` carry one of the given org roles? */
function hasOrgRole(resource: unknown, ...roles: OrgRole[]): boolean {
  return (
    typeof resource === "object" &&
    resource !== null &&
    "role" in resource &&
    roles.includes((resource as { role: OrgRole }).role)
  );
}

export const abilities = defineAbilities({
  rules: {
    "audit.read": { roles: [ADMIN] },
    "audit.export": { roles: [ADMIN] },
    "users.manage": { roles: [ADMIN] },

    // Org-scoped DeskLine rules — the resource is the caller's own
    // Membership row (role: "owner" | "agent" | "viewer"), not the
    // platform Role/Permission system above. Ticket CRUD is Agent-only
    // per the persona spec — Owner/Viewer get read-only org-wide
    // visibility instead, enforced at the query level (see
    // getVisibleTicketsWhere in src/lib/tickets.ts), not via an ability.
    "members.manage": (_session, resource) => hasOrgRole(resource, "owner"),
    "ticket.create": (_session, resource) => hasOrgRole(resource, "agent"),
    "ticket.mutate": (_session, resource) => hasOrgRole(resource, "agent"),
  },
});
