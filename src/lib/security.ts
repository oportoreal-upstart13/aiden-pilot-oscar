import "server-only";
import { configureSecurity } from "@upstart13-com/aiden-security";
import { auth } from "@/lib/auth";
// Side-effect import: registers the Prisma audit sink (see src/lib/audit.ts).
// `instrumentation.ts` also imports it, but under `next dev` with Turbopack
// each route can compile into its own isolated module graph, so a sink
// registered only from instrumentation's graph never reaches route handlers
// — every route already imports THIS file, so importing it here guarantees
// the sink is registered in the same module instance every route uses.
import "@/lib/audit";

configureSecurity({ getSession: () => auth() });

export {
  withAuth,
  parseRequest,
  assertOwnership,
  assertCan,
  auditLog,
  RequestValidationError,
  OwnershipError,
  AbilityError,
} from "@upstart13-com/aiden-security";
