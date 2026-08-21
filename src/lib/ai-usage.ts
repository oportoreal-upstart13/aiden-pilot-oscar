import "server-only";
import {
  getRequestContext,
  setAIUsageSink,
} from "@upstart13-com/aiden-logging";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

/**
 * Persist AI usage to the `AIUsage` table, and correlate it.
 *
 * `AIUsageRecord` carries `provider`, `model`, token counts, `costUSD`,
 * `latencyMs`, `requestId` and `userId` — but **no `route` and no
 * `orgId`**, and `getRequestContext()` returns only
 * `{ requestId, userId }`. Neither can be recovered from the record, so
 * the app owns the correlation: a `requestId → { route, orgId, userId }`
 * map, written immediately before each AI call and cleared in a
 * `finally`. This is explicit app state; the SDK does not provide it.
 *
 * Importing this module registers the sink. It is imported from
 * `src/lib/triage.ts`, which lives in the route module graph — not only
 * from `instrumentation.ts`, which Next bundles into a separate server
 * chunk that can end up holding its own copy of the package.
 */

/** What the sink cannot learn from the record and must be told. */
export interface AICallContext {
  /** The route that issued the call, e.g. `"POST /api/tickets"`. */
  route: string;
  orgId: string;
  userId: string;
}

const inFlight = new Map<string, AICallContext>();

setAIUsageSink(async (record) => {
  const context = record.requestId
    ? inFlight.get(record.requestId)
    : undefined;

  if (!context) {
    // Metadata only — never prompts or ticket content.
    log.warn(
      { provider: record.provider, model: record.model },
      "AI usage record has no correlated call context; not persisted"
    );
    return;
  }

  try {
    await prisma.aIUsage.create({
      data: {
        orgId: context.orgId,
        userId: context.userId,
        route: context.route,
        provider: record.provider,
        model: record.model,
        promptTokens: record.promptTokens,
        completionTokens: record.completionTokens,
        costUsd: record.costUSD,
      },
    });
  } catch (err: unknown) {
    // The sink is fire-and-forget; a throw here would be swallowed by the
    // SDK, so the failure has to be logged or it disappears entirely.
    log.error({ err }, "failed to persist AI usage row");
  }
});

/**
 * Open a correlation window. Returns the `requestId` the window is keyed
 * on, or `null` when there is no request context to correlate against —
 * in which case the usage record will be logged and dropped rather than
 * attributed to the wrong tenant.
 *
 * Callers must pair this with `endAICall` in a `finally`. Prefer
 * `withAIUsageContext` unless the call outlives the handler.
 */
export function beginAICall(context: AICallContext): string | null {
  const requestId = getRequestContext()?.requestId;
  if (!requestId) {
    log.warn(
      { route: context.route },
      "no request context; AI usage for this call cannot be correlated"
    );
    return null;
  }
  inFlight.set(requestId, context);
  return requestId;
}

/** Close a correlation window. Safe to call with `null`. */
export function endAICall(requestId: string | null): void {
  if (requestId !== null) inFlight.delete(requestId);
}

/**
 * Run `fn` inside a correlation window, clearing it afterwards even if
 * `fn` throws.
 *
 * Only correct when the usage record is emitted *before* `fn` resolves,
 * which is the case for `ai.complete()`. A streamed call is different:
 * `createAIStreamResponse` returns a Response immediately and fires the
 * sink later, from inside the stream, when it calls `finalResponse()`.
 * Wrapping only the `ai.stream()` call would close the window before the
 * record arrives and the row would be dropped. A streaming route must use
 * `beginAICall` and close the window from the stream's `onDone` and
 * `onError` hooks instead.
 */
export async function withAIUsageContext<T>(
  context: AICallContext,
  fn: () => Promise<T>
): Promise<T> {
  const requestId = beginAICall(context);
  try {
    return await fn();
  } finally {
    endAICall(requestId);
  }
}
