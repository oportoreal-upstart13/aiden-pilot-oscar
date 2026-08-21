/**
 * Single source of truth for RBAC role and permission strings.
 *
 * Imported by `src/lib/abilities.ts` (ability rules) and `prisma/seed.ts`
 * (role/permission seeding) so renaming a role or permission touches one
 * place and is checked at compile time — no more silently drifting strings.
 */

/** Permission keys, paired with the descriptions seeded into the DB. */
export const PERMISSIONS = [
  { key: "audit.read", description: "Read the audit log" },
  { key: "audit.export", description: "Export audit log entries to CSV" },
  { key: "users.manage", description: "Assign and revoke user roles" },
] as const;

/** Role names, descriptions, and the permission keys granted to each. */
export const ROLES = [
  {
    name: "admin",
    description:
      "Full access — audit log, user management, all users' resources",
    permissions: ["audit.read", "audit.export", "users.manage"],
  },
  {
    name: "member",
    description: "Default user role with no admin permissions",
    permissions: [] as string[],
  },
] as const;

/** A permission key, e.g. `"audit.read"`. */
export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

/** A role name, e.g. `"admin"`. */
export type RoleName = (typeof ROLES)[number]["name"];

// ─── DeskLine org-scoped roles ───────────────────────────────────────────
//
// These are stored in `Membership.role`, NOT in the global `Role` table
// above. The two are different authorities and must not be conflated: the
// `{ roles: [...] }` ability shorthand intersects `session.user.roles`
// (NextAuth's global roles), while DeskLine's roles are per-organization
// and differ per organization for the same user. Every org-scoped ability
// is therefore a predicate over the active membership, never the shorthand.

/** Org-scoped role names stored in `Membership.role`. */
export const ORG_ROLES = ["owner", "agent", "viewer"] as const;

/** An org-scoped role, e.g. `"agent"`. */
export type OrgRole = (typeof ORG_ROLES)[number];

/** Ticket lifecycle values stored in `Ticket.status`. */
export const TICKET_STATUSES = ["open", "pending", "closed"] as const;

/** A ticket status, e.g. `"open"`. */
export type TicketStatus = (typeof TICKET_STATUSES)[number];
