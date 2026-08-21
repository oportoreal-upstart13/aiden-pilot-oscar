/**
 * The app's single AI client factory set.
 *
 * Each provider factory resolves its default model from `aiden.config.ts`
 * (`ai.models`), and `getAI()` resolves the live provider from
 * `ai.defaultProvider`. Route handlers only ever call `getAI()`, so switching
 * provider is one config line with zero route edits.
 */

import { createAIClient, type AIClient } from "@upstart13-com/aiden-ai";
import { aidenConfig } from "@/../aiden.config";

const { models, defaultProvider } = aidenConfig.ai;

export const ai = {
  openai: (model: string = models.openai): Promise<AIClient> =>
    createAIClient({
      provider: "openai",
      model,
      apiKey: process.env.OPENAI_API_KEY,
    }),
  anthropic: (model: string = models.anthropic): Promise<AIClient> =>
    createAIClient({
      provider: "anthropic",
      model,
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
  google: (model: string = models.google): Promise<AIClient> =>
    createAIClient({
      provider: "google",
      model,
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  mistral: (model: string = models.mistral): Promise<AIClient> =>
    createAIClient({
      provider: "mistral",
      model,
      apiKey: process.env.MISTRAL_API_KEY,
    }),
  groq: (model: string = models.groq): Promise<AIClient> =>
    createAIClient({
      provider: "groq",
      model,
      apiKey: process.env.GROQ_API_KEY,
    }),
  cohere: (model: string = models.cohere): Promise<AIClient> =>
    createAIClient({
      provider: "cohere",
      model,
      apiKey: process.env.COHERE_API_KEY,
    }),
};

/**
 * The app-wide AI client, resolved from `aiden.config.ts ai.defaultProvider`.
 * Every DeskLine route goes through this.
 */
export function getAI(): Promise<AIClient> {
  return ai[defaultProvider]();
}