import { z } from "zod";
import { TICKET_STATUSES } from "@/config/rbac";

/**
 * Request schemas for the ticket routes.
 *
 * Pure Zod, no SDK imports — safe to import from a `"use client"` form
 * for `zodResolver`. `parseQuery` and `RequestValidationError` live in
 * `src/lib/security.ts` precisely so this stays true.
 */

/** Tones the draft panel offers. */
export const DRAFT_TONES = ["neutral", "apologetic", "concise"] as const;

/** A draft tone, e.g. `"apologetic"`. */
export type DraftTone = (typeof DRAFT_TONES)[number];

// ─── AI triage vocabulary ────────────────────────────────────────────────
//
// The closed sets AI triage may assign. They live here, not in
// `ai-prompts.ts`, so the phase 4 badge components can import them without
// dragging server-only AI wiring into a client bundle. `ai-prompts.ts`
// builds the Zod contract and the JSON Schema mirror from these.
//
// Every value the seed pre-classifies falls inside these sets.

/** Priorities AI triage may assign. */
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

/** A ticket priority, e.g. `"high"`. */
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** Categories AI triage may assign. */
export const TICKET_CATEGORIES = [
  "billing",
  "technical",
  "hardware",
  "data",
  "account",
  "other",
] as const;

/** A ticket category, e.g. `"billing"`. */
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

/** Sentiments AI triage may assign. */
export const TICKET_SENTIMENTS = [
  "positive",
  "neutral",
  "frustrated",
  "angry",
] as const;

/** A ticket sentiment, e.g. `"frustrated"`. */
export type TicketSentiment = (typeof TICKET_SENTIMENTS)[number];

/**
 * `GET /api/tickets`. Any status may be *filtered* on, including closed.
 * `limit` is bounded rather than optional so a list read cannot be turned
 * into an unbounded table scan by query string.
 */
export const ListTicketsQuery = z.object({
  status: z.enum([...TICKET_STATUSES]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/** `POST /api/tickets`. */
export const CreateTicketBody = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10_000),
});

/**
 * `PATCH /api/tickets/[id]`.
 *
 * `status` deliberately excludes `"closed"`. Closing is the job of
 * `POST /api/tickets/[id]/close`, which emits a `ticket.close` audit
 * event; accepting `"closed"` here would let a close be recorded as a
 * `ticket.update` and quietly weaken the audit trail.
 *
 * Every field is optional, but an empty object is rejected — a no-op
 * update would otherwise emit an audit event recording that nothing
 * changed.
 */
export const UpdateTicketBody = z
  .object({
    subject: z.string().trim().min(1).max(200).optional(),
    body: z.string().trim().min(1).max(10_000).optional(),
    status: z.enum(["open", "pending"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

/** `POST /api/tickets/[id]/draft`. */
export const DraftBody = z.object({
  tone: z.enum([...DRAFT_TONES]).default("neutral"),
});
