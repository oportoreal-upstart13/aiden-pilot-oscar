import "server-only";
import { defineAbilities } from "@upstart13-com/aiden-security";
import { ROLES } from "@/config/rbac";

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

export const abilities = defineAbilities({
  rules: {
    "audit.read": { roles: [ADMIN] },
    "audit.export": { roles: [ADMIN] },
    "users.manage": { roles: [ADMIN] },
    // Example resource-level rule. Uncomment + add a Post model fragment
    // when you scaffold one.
    //
    // "post.delete": (session, post: { userId: string }) =>
    //   post.userId === session.user.id,
  },
});
