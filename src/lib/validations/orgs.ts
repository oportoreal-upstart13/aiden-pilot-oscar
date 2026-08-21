import { z } from "zod";
import { ORG_ROLES } from "@/config/rbac";

/**
 * Request schemas for the organization and member-administration routes.
 *
 * Pure Zod, no SDK imports — safe to import from a `"use client"` form.
 * `parseQuery` and `RequestValidationError` live in `src/lib/security.ts`
 * precisely so this stays true.
 */

/**
 * `POST /api/orgs/switch`.
 *
 * The id is only shape-checked here. Whether the caller may switch to it
 * is a membership question, answered by the `Membership` read and
 * `assertOrgVisible` — a non-member target 404s rather than revealing
 * that the organization exists.
 */
export const SwitchOrgBody = z.object({
  orgId: z.string().trim().min(1).max(64),
});

/** `PATCH /api/admin/members/[id]`. */
export const RoleChangeBody = z.object({
  role: z.enum([...ORG_ROLES]),
});

/**
 * `GET /api/admin/audit`. Bounded so an admin read cannot be turned into
 * an unbounded scan of the audit table by query string.
 */
export const ListAuditQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/** `GET /api/admin/usage`. */
export const ListUsageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
