import "server-only";
import { configureSecurity } from "@upstart13-com/aiden-security";
import { auth } from "@/lib/auth";

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
