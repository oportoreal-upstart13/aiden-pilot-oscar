import { securityHeaders } from "@upstart13-com/aiden-security/middleware";

// NOTE: `securityHeaders` is a FACTORY — calling it with an options object
// returns the actual per-request middleware function. The package's own
// README shows `export { securityHeaders as middleware } from "...";`,
// but that re-exports the factory itself under the `middleware` name:
// Next.js then invokes the factory per-request (passing the NextRequest
// in as `options`), which returns another function, not a Response —
// crashing every request with "Expected an instance of Response to be
// returned". Filed as a doc bug in .claude/fixes/aiden-security.md. The
// fix is to call the factory here, once, at module load.
export const middleware = securityHeaders();
