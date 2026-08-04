import { NextResponse } from "next/server";
import {
  deleteUserAccount,
  updateProfileSchema,
} from "@upstart13-com/aiden-auth";
import { withAuth, parseRequest, auditLog } from "@/lib/security";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (_req, { session }) => {
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      emailVerified: true,
      createdAt: true,
      accounts: {
        select: { provider: true, providerAccountId: true, type: true },
      },
      roles: { select: { name: true, description: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Derive `hasPassword` from a separate, minimal query so the bcrypt hash
  // is never materialized into the rich `user` object above (avoids
  // widening the blast radius of any future log/serialize of `user`).
  const credentials = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    hasPassword: credentials?.passwordHash != null,
    accounts: user.accounts,
    roles: user.roles,
  });
});

export const PATCH = withAuth(async (req, { session }) => {
  const jsonCheck = requireJson(req);
  if (jsonCheck) return jsonCheck;

  const body = await parseRequest(req, updateProfileSchema);

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: body,
    select: { id: true, name: true, email: true, image: true },
  });

  auditLog({
    event: "user.update",
    actorId: session.user.id,
    resourceId: session.user.id,
    metadata: { fields: Object.keys(body) },
  });

  return NextResponse.json({ ok: true, user });
});

export const DELETE = withAuth(async (_req, { session }) => {
  auditLog({
    event: "user.delete",
    actorId: session.user.id,
    resourceId: session.user.id,
  });

  await deleteUserAccount(prisma, session.user.id);

  return new NextResponse(null, { status: 204 });
});

function requireJson(req: Request): NextResponse | null {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 415 }
    );
  }
  return null;
}
