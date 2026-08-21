import "server-only";
import { defineAbilities } from "@upstart13-com/aiden-security";
import type { AbilityPredicate } from "@upstart13-com/aiden-security";
import { ROLES, ORG_ROLES } from "@/config/rbac";
import type { OrgRole } from "@/config/rbac";

/**
 * App-wide ability rules.
 *
 * Two authorities live here and must not be conflated. The
 * `{ roles: [...] }` shorthand intersects `session.user.roles` —
 * NextAuth's *global* roles — and is correct only for rules that are
 * genuinely global. DeskLine's roles live in `Membership.role`, differ per
 * organization for the same user, and can change while a session is open,
 * so every org-scoped rule is a predicate that reads the active
 * membership passed as the ability resource.
 *
 * Mirroring the org role into the JWT so the shorthand could be reused was
 * rejected in the plan: it would create two sources of truth for one fact
 * and a stale *authorization* claim the moment an owner changes someone's
 * role.
 */
const ADMIN = ROLES.find((r) => r.name === "admin")!.name;

/**
 * Recover the active membership's role from the ability resource.
 *
 * The resource is typed `unknown` because `AbilityPredicate`'s parameter
 * is optional and contravariant — a predicate narrowed to a concrete
 * resource type is not assignable to the rules map under
 * `strictFunctionTypes`. Validating at runtime instead of casting also
 * makes the rule fail closed: `assertCan(abilities, session, action)`
 * called without a resource denies rather than throwing.
 */
function activeRole(resource: unknown): OrgRole | null {
  if (typeof resource !== "object" || resource === null) return null;
  const role = (resource as { role?: unknown }).role;
  if (typeof role !== "string") return null;
  return (ORG_ROLES as readonly string[]).includes(role)
    ? (role as OrgRole)
    : null;
}

/** Allow the action when the caller's active membership holds one of `allowed`. */
function orgRole(...allowed: OrgRole[]): AbilityPredicate {
  return (_session, resource) => {
    const role = activeRole(resource);
    return role !== null && allowed.includes(role);
  };
}

export const abilities = defineAbilities({
  rules: {
    // ─── Starter global rules — genuinely global, shorthand is correct ───
    "audit.read": { roles: [ADMIN] },
    "audit.export": { roles: [ADMIN] },
    "users.manage": { roles: [ADMIN] },

    // ─── DeskLine, org-scoped: resource is the active membership ───
    //
    // Reading is a membership fact — any role in the organization may read
    // its tickets, and which rows they see is decided by the org filter and
    // the ownership step, not here.
    "ticket.read": orgRole("owner", "agent", "viewer"),

    // Mutation and AI actions are agent-only. This matters because the
    // ownership step degenerates to a presence check for owners: an owner
    // passes it on any in-org ticket, so `assertCan` alone is what denies
    // them, with a 403. That leaks nothing — owners may already read the
    // row. Owners govern the organization; agents work the queue.
    "ticket.create": orgRole("agent"),
    "ticket.update": orgRole("agent"),
    "ticket.close": orgRole("agent"),
    "ticket.draft": orgRole("agent"),
    "ticket.classify": orgRole("agent"),

    // ─── /admin/* — a pure role gate, no ownership predicate applies ───
    "org.members.read": orgRole("owner"),
    "org.members.manage": orgRole("owner"),
    "org.audit.read": orgRole("owner"),
    "org.usage.read": orgRole("owner"),
  },
});
