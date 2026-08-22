import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Design-system enforcement.
 *
 * "Never hardcode colors" is golden rule 1 of `docs/design-system/00-overview.md`
 * and is graded as a binary criterion, but until now it was enforced only by
 * review and grep — `.claude/fixes/ui.md` claimed an ESLint rule that did not
 * exist. This is that rule.
 *
 * It bans Tailwind's default palette scales in favour of the semantic tokens
 * (`bg-muted`, `text-muted-foreground`, `bg-primary`, `text-success`,
 * `border-border`, …), which are what make dark mode work for free.
 *
 * Known tension: `05-data-display.md` shows a metric-card delta using
 * `text-emerald-600 dark:text-emerald-400` and calls it "the ONLY place
 * non-token colors appear". This rule forbids that form. `02-components.md`
 * renders the same card with `text-success`, which is the tokenised
 * equivalent and passes. The `05` example should be corrected upstream; until
 * then, use `text-success` / `text-destructive`.
 */
const COLOR_PREFIX = [
  "bg",
  "text",
  "border",
  "ring",
  "fill",
  "stroke",
  "from",
  "via",
  "to",
  "divide",
  "outline",
  "decoration",
  "shadow",
  "accent",
  "caret",
  "placeholder",
].join("|");

const TAILWIND_PALETTE = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
].join("|");

/** e.g. `bg-gray-500`, `text-emerald-400`, `border-slate-200`. */
const RAW_COLOR_UTILITY = `(?:${COLOR_PREFIX})-(?:${TAILWIND_PALETTE})-(?:50|[1-9]00|950)`;

const RAW_COLOR_MESSAGE =
  "Hardcoded Tailwind palette colour. Use a semantic token instead " +
  "(bg-background, bg-card, bg-muted, text-foreground, text-muted-foreground, " +
  "bg-primary, text-success, text-warning, text-destructive, border-border). " +
  "See docs/design-system/01-foundations.md.";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${RAW_COLOR_UTILITY}/]`,
          message: RAW_COLOR_MESSAGE,
        },
        {
          selector: `TemplateElement[value.raw=/${RAW_COLOR_UTILITY}/]`,
          message: RAW_COLOR_MESSAGE,
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            "Inline styles bypass the theme and break dark mode. Use Tailwind " +
            "utilities with semantic tokens. See docs/design-system/00-overview.md.",
        },
      ],
    },
  },
]);
