/**
 * Lazy AI client factories — call `ai.openai()` etc. only when needed
 * so SDKs you don't have installed never fault. Toggle providers and
 * pin a default `model` per provider in aiden.config.ts, then install
 * the corresponding SDK.
 *
 * Each factory resolves its model from `aiden.config.ts`
 * (`ai.providers[x].model`) and falls back to a built-in default only
 * when that field is unset. Pass an explicit `model` arg to override.
 */

import { createAIClient, type AIClient } from "@upstart13-com/aiden-ai";
import { aidenConfig } from "@/../aiden.config";

const providerModels = aidenConfig.ai.providers;

export const ai = {
  openai: (
    model = providerModels.openai.model ?? "gpt-4o-mini"
  ): Promise<AIClient> =>
    createAIClient({
      provider: "openai",
      model,
      apiKey: process.env.OPENAI_API_KEY,
    }),
  anthropic: (
    model = providerModels.anthropic.model ?? "claude-haiku-4-5"
  ): Promise<AIClient> =>
    createAIClient({
      provider: "anthropic",
      model,
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
  google: (
    model = providerModels.google.model ?? "gemini-2.5-flash"
  ): Promise<AIClient> =>
    createAIClient({
      provider: "google",
      model,
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  mistral: (
    model = providerModels.mistral.model ?? "mistral-small-latest"
  ): Promise<AIClient> =>
    createAIClient({
      provider: "mistral",
      model,
      apiKey: process.env.MISTRAL_API_KEY,
    }),
  groq: (
    model = providerModels.groq.model ?? "llama-3.3-70b-versatile"
  ): Promise<AIClient> =>
    createAIClient({
      provider: "groq",
      model,
      apiKey: process.env.GROQ_API_KEY,
    }),
  cohere: (
    model = providerModels.cohere.model ?? "command-r"
  ): Promise<AIClient> =>
    createAIClient({
      provider: "cohere",
      model,
      apiKey: process.env.COHERE_API_KEY,
    }),
};
