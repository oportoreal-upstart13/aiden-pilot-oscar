/**
 * AIDEN feature flags.
 *
 * `aiden doctor` reads this to decide which env vars are required, and
 * `aiden upgrade` reads it to know which codemods to apply.
 */

export const aidenConfig = {
  /** AIDEN single-train version this app was last upgraded to. */
  version: "2.0.1",

  /**
   * Your app's identity. These are placeholders — replace them with your
   * product's real values. `NEXT_PUBLIC_APP_*` env vars override the
   * name/tagline/copyright at runtime (see src/config/brand.ts).
   */
  app: {
    name: "DeskLine",
    shortName: "deskline",
    tagline: "Multi-tenant AI support desk workspace.",
    description:
      "DeskLine helps teams triage and resolve support tickets with AI-assisted summaries, org-scoped access, and a full audit trail.",
    supportEmail: "support@example.com",
    url: "https://example.com",
    companyLegalName: "Your Company, Inc.",
    footerLinks: [] as { href: string; label: string }[],
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
     * Toggle providers with `enabled` and optionally pin a default `model`.
     * When `model` is omitted, src/lib/ai.ts falls back to a built-in default.
     */
    providers: {
      openai: { enabled: false, model: undefined as string | undefined },
      anthropic: { enabled: true, model: undefined as string | undefined },
      google: { enabled: false, model: undefined as string | undefined },
      mistral: { enabled: false, model: undefined as string | undefined },
      groq: { enabled: false, model: undefined as string | undefined },
      cohere: { enabled: false, model: undefined as string | undefined },
    },
  },

  audit: {
    enabled: true, // Prisma sink registered in src/lib/audit.ts
  },

  rbac: {
    enabled: true, // roles seeded in prisma/seed.ts; rules in src/lib/abilities.ts
  },

  billing: {
    enabled: false, // toggle when wiring Stripe in src/lib/stripe.ts
  },

  email: {
    enabled: false, // toggle when wiring SendGrid in src/lib/email.ts
  },
} as const;

export type AidenConfig = typeof aidenConfig;
