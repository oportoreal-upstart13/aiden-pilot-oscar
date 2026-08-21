/**
 * Dev-only role impersonation. Returns 404 in production so the route
 * is invisible. The actual JWT mutation happens via NextAuth's
 * `update()` mechanism — the client calls `useSession().update({ roles })`
 * after this endpoint resolves.
 *
 * In a real deployment, replace this with a server-action that
 * persists the impersonation choice (encrypted cookie scoped to dev).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, parseRequest } from "@/lib/security";

const Body = z.object({
  role: z.string().min(1),
});

export const POST = withAuth(async (req) => {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not Found", { status: 404 });
  }
  const { role } = await parseRequest(req, Body);
  return NextResponse.json({ ok: true, assumed: role });
});
