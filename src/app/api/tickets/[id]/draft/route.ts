import { NextResponse } from "next/server";
import { createAIStreamResponse } from "@upstart13-com/aiden-realtime";
import { assertCan, auditLog, parseRequest } from "@/lib/security";
import { withAuthIdRoute } from "@/lib/routes";
import { abilities } from "@/lib/abilities";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { resolveActiveOrg } from "@/lib/org";
import {
  assertTicketOwnership,
  orgTicketsWhere,
  ticketDraftSelect,
} from "@/lib/tickets";
import { DraftBody } from "@/lib/validations/tickets";
import { getAI } from "@/lib/ai";
import { beginAICall, endAICall } from "@/lib/ai-usage";
import {
  DRAFT_MAX_TOKENS,
  draftSystemPrompt,
  draftUserMessage,
} from "@/lib/ai-prompts";

const ROUTE = "POST /api/tickets/[id]/draft";

/**
 * Stream an AI-drafted customer reply.
 *
 * The entire perimeter runs *before* a single byte is streamed —
 * authentication, body validation, the org-filtered read, the ownership
 * step, and the ability gate. Once `createAIStreamResponse` returns, the
 * status line is committed and no later check could turn into a 401, 404
 * or 403; there is no point at which a denial would arrive too late.
 *
 * The provider call is made before streaming too, so a provider that is
 * down becomes a readable 503 rather than a stream that opens and dies.
 * A failure *after* the first byte cannot be a status code — it arrives
 * as the SSE `event: error` frame that `createAIStreamResponse` emits,
 * and `useAIStream` surfaces it on the client.
 */
export const POST = withAuthIdRoute(async (req, { session, params }) => {
  const { tone } = await parseRequest(req, DraftBody);
  const membership = await resolveActiveOrg(session.user.id);

  const ticket = await prisma.ticket.findFirst({
    where: { ...orgTicketsWhere(membership, session.user.id), id: params.id },
    select: ticketDraftSelect,
  });

  assertTicketOwnership(ticket, membership, session.user.id);
  assertCan(abilities, session, "ticket.draft", membership);

  const client = await getAI();

  let stream;
  try {
    stream = await client.stream({
      system: draftSystemPrompt(tone),
      messages: [
        {
          role: "user",
          content: draftUserMessage(ticket.subject, ticket.body),
        },
      ],
      maxTokens: DRAFT_MAX_TOKENS,
      signal: req.signal,
    });
  } catch (err: unknown) {
    log.error({ err, ticketId: ticket.id }, "draft provider call failed");
    return NextResponse.json(
      {
        error:
          "The AI provider is unavailable right now. The ticket is unaffected — try again in a moment.",
      },
      { status: 503 }
    );
  }

  // The usage window must be open before the stream is consumed:
  // `createAIStreamResponse` calls `finalResponse()` internally, which is
  // what reaches the usage sink. `withAIUsageContext` is deliberately not
  // used here — it closes on promise resolution, which for a stream is
  // long before the record is emitted.
  const usageWindow = beginAICall({
    route: ROUTE,
    orgId: membership.orgId,
    userId: session.user.id,
  });

  // Emitted here, not from `onDone`. See the phase 4 report and D6: this
  // records that a privileged AI action was authorised and issued, which
  // is true the moment the provider call succeeds. Deferring it to
  // completion would leave every aborted draft — the abuse-shaped case —
  // with no trace at all.
  auditLog({
    event: "ai.draft",
    resourceId: ticket.id,
    metadata: { orgId: membership.orgId, model: client.model, tone },
  });

  return createAIStreamResponse(stream, {
    signal: req.signal,
    onDone: () => {
      endAICall(usageWindow);
    },
    onError: (err) => {
      log.error({ err, ticketId: ticket.id }, "draft stream failed mid-flight");
      endAICall(usageWindow);
    },
  });
});
