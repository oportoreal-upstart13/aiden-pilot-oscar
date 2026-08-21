import { aidenConfig } from "@/../aiden.config";

/**
 * Per-customer brand identity, derived from the `app` block in
 * `aiden.config.ts` with `NEXT_PUBLIC_APP_*` env vars taking precedence
 * when set. The shape matches the `brand` prop expected by the
 * `@upstart13-com/aiden-ui` layout primitives (SiteHeader, SiteFooter,
 * DashboardNav, DashboardHeader, MobileNav), so layouts can pass it
 * straight through.
 *
 *   import { brand } from "@/config/brand";
 *   <SiteHeader brand={brand} />
 */
export interface Brand {
  name: string;
  tag?: string;
  href?: string;
  legalName?: string;
  tagline?: string;
}

export const brand: Brand = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? aidenConfig.app.name,
  href: aidenConfig.app.url,
  legalName: aidenConfig.app.companyLegalName,
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE ?? aidenConfig.app.tagline,
};

/** Copyright line, env-overridable; falls back to the legal name. */
export const copyright: string =
  process.env.NEXT_PUBLIC_APP_COPYRIGHT ??
  `© ${new Date().getFullYear()} ${aidenConfig.app.companyLegalName}`;
