import "server-only";
import { z } from "zod";
import { withAuth, OwnershipError } from "@/lib/security";
import { log } from "@/lib/logger";
import type { AuthHandlerContext } from "@upstart13-com/aiden-security";

/**
 * Route-handler adapters.
 *
 * Two problems are solved here, once, instead of in every route file.
 *
 * **1. The handler context shape.** `withAuth` returns
 * `(req, ctx?: { params: P }) => Promise<Response>` — the context is
 * *optional*. Next's generated route types extract the second parameter
 * with `SecondArg<T> = T extends (...args: [any, infer T]) => any ? ...`
 * and require the result to satisfy `{ params: Promise<SegmentParams> }`.
 * An optional parameter yields `{ params: P } | undefined`, and the
 * `| undefined` fails that constraint — which is why the starter's own
 * dynamic route ends in a cast at the export. The adapters below return
 * real wrapper functions with the exact arity Next expects, so no route
 * needs a cast and none can drift.
 *
 * **2. Unvalidated params reaching a query — the dangerous one.**
 * `withAuth` computes `const params = ctx?.params ?? {}`. If the context
 * is ever absent, `params` is `{}` while its type still says
 * `Promise<{ id: string }>`, so `(await params).id` is `undefined` with
 * the type claiming `string`. Prisma **omits** `undefined` filters rather
 * than matching them against null, so
 * `findFirst({ where: { id: undefined, orgId } })` would return the
 * organization's first ticket — and the ownership step would wave it
 * through for owners and viewers, because for them it is only a presence
 * check. That is a wrong-row read, not a crash: no error surfaces, the
 * response looks entirely normal, and it lands squarely on the two graded
 * capabilities. `withAuthIdRoute` therefore Zod-validates the resolved
 * params before the handler runs, so no query can ever see an
 * unvalidated id.
 */

/** The params contract for a `[id]` segment, as Next passes it. */
export type RouteParams = Promise<{ id: string }>;

/**
 * Validated route params. Bounded rather than merely non-empty: ids in
 * this app are cuids or short seed literals, and an unbounded path
 * segment has no business reaching the database.
 */
const IdParams = z.object({
  id: z.string().trim().min(1).max(64),
});

/** A validated `[id]` param. */
export type IdParam = z.infer<typeof IdParams>;

/** Handler for a dynamic route, receiving params already resolved and validated. */
export type IdRouteHandler = (
  req: Request,
  ctx: Omit<AuthHandlerContext, "params"> & { params: IdParam }
) => Promise<Response>;

/** Handler for a route with no dynamic segment. */
export type RouteHandler = (
  req: Request,
  ctx: AuthHandlerContext
) => Promise<Response>;

/**
 * Wrap a handler for a `[id]` route: authenticates, awaits and validates
 * the params, then delegates.
 *
 * A params failure throws `OwnershipError` — 404, with the same body as
 * every other 404 in the app — rather than 400. The plan's route table
 * lists 404 as the unhappy path for these routes, an id that cannot be
 * used names no resource, and a 404 signals nothing a 400 would not.
 */
export function withAuthIdRoute(
  handler: IdRouteHandler
): (req: Request, ctx: { params: RouteParams }) => Promise<Response> {
  const inner = withAuth<RouteParams>(
    async (req, { session, params, requestId }) => {
      const parsed = IdParams.safeParse(await params);
      if (!parsed.success) {
        // Never silently: this is a wiring failure, not user input.
        log.error(
          { issues: parsed.error.flatten() },
          "route params failed validation; refusing to query"
        );
        throw new OwnershipError();
      }
      return handler(req, { session, params: parsed.data, requestId });
    }
  );

  // A real wrapper, not a cast: the returned function's second parameter
  // is required, which is what Next's route type check demands.
  return (req, ctx) => inner(req, ctx);
}

/**
 * Wrap a handler for a route with no dynamic segment. Returning a
 * single-parameter function keeps Next's `SecondArg` extraction at `any`,
 * so the context constraint is satisfied without a cast here either.
 */
export function withAuthRoute(
  handler: RouteHandler
): (req: Request) => Promise<Response> {
  const inner = withAuth(handler);
  return (req) => inner(req);
}
