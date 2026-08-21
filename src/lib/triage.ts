import "server-only";
import { getAI } from "@/lib/ai";
import { log } from "@/lib/logger";
import { withAIUsageContext } from "@/lib/ai-usage";
import {
  TRIAGE_JSON_SCHEMA,
  TRIAGE_MAX_TOKENS,
  TRIAGE_SYSTEM_PROMPT,
  TriageResult,
  triageUserMessage,
} from "@/lib/ai-prompts";

/**
 * AI ticket triage — the app's single structured-output use.
 *
 * AI is an enhancement, never a gate: every failure mode returns `null`
 * and the ticket ships unclassified. Nothing partial is ever persisted —
 * a reply that parses but fails validation is discarded whole.
 */

export interface TriageInput {
  subject: string;
  body: string;
  /** Correlation for the usage sink; neither is recoverable from the record. */
  route: string;
  orgId: string;
  userId: string;
}

/** What was classified, plus the model that did it, for the audit event. */
export interface TriageOutcome {
  result: TriageResult;
  model: string;
}

export async function triageTicket(
  input: TriageInput
): Promise<TriageOutcome | null> {
  try {
    const client = await getAI();

    const response = await withAIUsageContext(
      { route: input.route, orgId: input.orgId, userId: input.userId },
      () =>
        client.complete({
          system: TRIAGE_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: triageUserMessage(input.subject, input.body),
            },
          ],
          responseSchema: TRIAGE_JSON_SCHEMA,
          temperature: 0,
          maxTokens: TRIAGE_MAX_TOKENS,
        })
    );

    // `parsed` is only populated when the adapter got structured output
    // from the provider. Anthropic never receives the schema, so on the
    // live provider this falls through to parsing the text.
    const candidate = response.parsed ?? parseJson(response.text);
    if (candidate === undefined) {
      log.warn(
        { model: response.model, finishReason: response.finishReason },
        "triage reply was not JSON; ticket ships unclassified"
      );
      return null;
    }

    const validated = TriageResult.safeParse(candidate);
    if (!validated.success) {
      // Issues only — never the reply text, which contains ticket content.
      log.warn(
        { model: response.model, issues: validated.error.flatten() },
        "triage reply failed validation; ticket ships unclassified"
      );
      return null;
    }

    return { result: validated.data, model: response.model };
  } catch (err: unknown) {
    log.error({ err }, "triage call failed; ticket ships unclassified");
    return null;
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    return undefined;
  }
}

/**
 * Unwrap a single enclosing markdown code fence, if there is one.
 *
 * Tolerance for what the provider actually returns, not trust in it:
 * `claude-haiku-4-5` wraps the object in ```` ```json … ``` ```` despite
 * the system prompt forbidding exactly that (see
 * `.claude/fixes/aiden-ai.md`). Nothing downstream is relaxed — whatever
 * comes out of here still goes through `TriageResult.safeParse`, and
 * anything that fails still degrades to `null` and an unclassified
 * ticket. Text that is not fenced is returned untouched.
 */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```[a-zA-Z0-9]*\s*\n?([\s\S]*?)\n?\s*```$/.exec(trimmed);
  return fenced ? fenced[1].trim() : trimmed;
}
