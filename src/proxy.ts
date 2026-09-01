import { securityHeaders } from "@upstart13-com/aiden-security/middleware";

/**
 * Security headers on every response.
 *
 * Next 16 renamed the middleware file from `middleware.ts` to `proxy.ts`
 * and looks for a named `proxy` export, falling back to the default —
 * `(isProxy ? mod.proxy : mod.middleware) || mod.default` in
 * `next/dist/build/templates/middleware.js`.
 *
 * **`securityHeaders` is a factory and must be called.** The package's own
 * docstring shows `export { securityHeaders as middleware }`, which
 * exports the factory itself: Next would invoke it with `(request, event)`
 * instead of an options object, it would return a function rather than a
 * response, and no header would ever be set. It would look wired up and
 * do nothing — which is the failure mode worth guarding against here,
 * because the symptom is invisible without inspecting a live response.
 *
 * Headers applied (`aiden-security/dist/middleware.js`):
 * Content-Security-Policy, Strict-Transport-Security, Permissions-Policy,
 * X-Frame-Options: DENY, X-Content-Type-Options: nosniff,
 * Referrer-Policy: strict-origin-when-cross-origin,
 * X-DNS-Prefetch-Control: off.
 */

/**
 * The package default is `script-src 'self'`. That breaks this app, and
 * the nonce alternative does not rescue it. Measured, not assumed:
 *
 *  - `/login` and `/register` are statically prerendered. Their HTML is
 *    written at build time, so a per-request nonce cannot appear in it —
 *    measured 0 of 3 inline scripts carrying a nonce. Those are the entry
 *    points; blocking them means the page renders and never hydrates, so
 *    the sign-in form does nothing.
 *  - Even on a dynamic route, where Next stamps its own scripts (17 of 18
 *    took the nonce), the `next-themes` anti-flash script injected by
 *    `ThemeProvider` never does. It is rendered by a component, not by
 *    Next's script pipeline.
 *  - A nonce and `'unsafe-inline'` cannot back each other up: browsers
 *    ignore `'unsafe-inline'` whenever a nonce is present.
 *
 * So `script-src` carries `'unsafe-inline'`, and that is a real cost —
 * it is the directive that would otherwise blunt injected-script XSS.
 * What it does not weaken is everything else, and those are not
 * decoration: `frame-ancestors 'none'` stops clickjacking, `object-src
 * 'none'` stops plugin-based execution, `form-action 'self'` and
 * `base-uri 'self'` stop an injected form or `<base>` from exfiltrating
 * to another origin, and `connect-src 'self'` stops beaconing out.
 *
 * The way to earn a strict `script-src` here is upstream: `aiden-ui`
 * would need to thread a nonce into `ThemeProvider`, and the auth pages
 * would have to stop being statically prerendered. Both are real changes,
 * neither belongs in this file.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "object-src 'none'",
].join("; ");

/**
 * HSTS is gated on the deployment actually being HTTPS, not on
 * `NODE_ENV`. `next start` runs in production mode, so a `NODE_ENV` check
 * still emits HSTS from `localhost` — and a browser that receives it pins
 * `localhost` to HTTPS for two years including subdomains, breaking every
 * other plain-HTTP project on that machine and needing a trip through
 * `chrome://net-internals` to undo.
 */
const httpsDeployment = (process.env.AUTH_URL ?? "").startsWith("https://");

export const proxy = securityHeaders({
  csp: CSP,
  hsts: httpsDeployment ? undefined : false,
});

export const config = {
  /**
   * Everything except Next's own immutable build output and the favicon.
   * Security headers belong on documents and API responses; hashed static
   * assets gain nothing and would only add work per request.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
