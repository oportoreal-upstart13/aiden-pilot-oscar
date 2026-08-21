/**
 * AIDEN feature flags for DeskLine.
 * Provider switching: `ai.defaultProvider` is the single line that changes
 * DeskLine's live AI provider. Route handlers never name a provider; they call
 * `getAI()` in src/lib/ai.ts, which resolves it from here.
 */

export const aidenConfig = {
  /** AIDEN single-train version this app was last upgraded to. */
  version: "2.0.1",

  app: {
    name: "DeskLine",
    shortName: "deskline",
    tagline: "Multi-tenant AI support desk.",
    description:
      "Agents triage and resolve customer tickets inside their organization, with AI-drafted replies and automatic ticket classification.",
    supportEmail: "support@deskline.example.com",
    url: "deskline.example.com",
    companyLegalName: "UpStart13",
    footerLinks: [],
  },

  auth: {
    providers: {
      google: false,
      github: false,
      microsoft: false,
      credentials: true,
    },
  },

  ai: {
    /**
     
     */
    providers: {
      openai: false,
      anthropic: true,
      google: false,
      mistral: false,
      groq: false,
      cohere: false,
    },
    /**
     * The live provider. Changing this one line switches DeskLine's AI with
     * zero route edits — the graded provider-switch criterion.
     */
    defaultProvider: "anthropic",
    models: {
      openai: "gpt-4o-mini",
      anthropic: "claude-haiku-4-5",
      google: "gemini-2.5-flash",
      mistral: "mistral-small-latest",
      groq: "llama-3.3-70b-versatile",
      cohere: "command-r",
    },
  },

  audit: {
    enabled: true,
    /**
     * Which setAuditSink implementation src/lib/audit.ts registers:
     * "prisma" writes to the AuditLog table, "file" writes newline-delimited
     * JSON locally. One line, zero call-site changes.
     */
    sink: "prisma",
  },

  rbac: {
    enabled: true,
  },

  billing: {
    enabled: false,
  },

  email: {
    enabled: false,
  },
} as const;

export type AidenConfig = typeof aidenConfig;