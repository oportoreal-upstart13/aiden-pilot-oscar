import { z } from "zod";
import { withAuth, parseRequest } from "@/lib/security";
import {
  withRateLimit,
  type AuthHandlerContext,
} from "@upstart13-com/aiden-security";
import { createAIStreamResponse } from "@upstart13-com/aiden-realtime";
import { ai } from "@/lib/ai";

const Body = z.object({
  prompt: z.string().min(1).max(10_000),
});

/**
 * Streamed chat endpoint. Picks the first AI provider you have an API
 * key for. Swap the call below to `ai.openai()` / `ai.anthropic()` /
 * etc. once you've decided on a default for your app.
 *
 * Wrapped in a per-user sliding-window rate limit (keyed on
 * `session.user.id`) so a single account can't drive unbounded provider
 * spend. Exceeding the window returns a 429. The default in-memory store
 * suits a single instance — swap in a shared store (e.g. Redis/Upstash)
 * for multi-instance deployments. Tune `limit`/`windowMs` for your app,
 * and call `setAIUsageSink()` to route usage records to your store for
 * cost monitoring.
 */
export const POST = withAuth(
  withRateLimit<AuthHandlerContext>(
    async (req) => {
      const { prompt } = await parseRequest(req, Body);

      const client = await firstAvailableProvider();
      const stream = await client.stream({
        messages: [{ role: "user", content: prompt }],
      });

      return createAIStreamResponse(stream, { signal: req.signal });
    },
    {
      limit: 20,
      windowMs: 60_000,
      keyFor: (_req, { session }) => session.user.id,
    }
  )
);

async function firstAvailableProvider() {
  if (process.env.OPENAI_API_KEY) return ai.openai();
  if (process.env.ANTHROPIC_API_KEY) return ai.anthropic();
  if (process.env.GOOGLE_API_KEY) return ai.google();
  if (process.env.MISTRAL_API_KEY) return ai.mistral();
  if (process.env.GROQ_API_KEY) return ai.groq();
  if (process.env.COHERE_API_KEY) return ai.cohere();
  throw new Error(
    "No AI provider API key is set. Configure one in aiden.config.ts and add the matching env var."
  );
}
