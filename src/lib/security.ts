import "server-only";
import { z } from "zod";
import {
  configureSecurity,
  RequestValidationError,
} from "@upstart13-com/aiden-security";
import { auth } from "@/lib/auth";

// Side-effect import: registers the Prisma audit sink from inside the
// route module graph. `instrumentation.ts` also imports it, but Next
// bundles that into a separate server chunk that can hold its own copy of
// `aiden-security` — a sink registered only there lands on an instance the
// handlers never resolve, and every audit event silently falls through to
// the default logger sink while `audit_logs` stays empty and `npm ls`
// looks clean. Every route imports this module, so registering here puts
// the sink on the instance the handlers actually use.
import "@/lib/audit";

configureSecurity({ getSession: () => auth() });

/**
 * Search-param counterpart to `parseRequest`.
 *
 * `parseRequest` validates bodies only; the SDK offers no equivalent for
 * search params. This throws the same `RequestValidationError`, so
 * `withAuth` maps it to the same 400 with the same flattened issue map.
 * No route reads `searchParams` unvalidated.
 *
 * It lives here rather than beside the schemas so that
 * `src/lib/validations/*` stays pure Zod: importing
 * `RequestValidationError` there would pull `aiden-security` — and
 * through it `aiden-logging` — into any `"use client"` form that wanted
 * a schema for `zodResolver`.
 *
 * Synchronous, unlike `parseRequest`: there is no body to await. Repeated
 * keys collapse to the last occurrence, which is correct for every schema
 * in this app — none accepts a repeated parameter.
 */
export function parseQuery<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): z.infer<T> {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    throw new RequestValidationError(parsed.error);
  }
  return parsed.data;
}

export {
  withAuth,
  parseRequest,
  assertOwnership,
  assertCan,
  auditLog,
  RequestValidationError,
  OwnershipError,
  AbilityError,
} from "@upstart13-com/aiden-security";
