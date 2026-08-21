import { NextResponse } from "next/server";
import {
  changePassword,
  changePasswordSchema,
  PasswordChangeError,
} from "@upstart13-com/aiden-auth";
import { withAuth, parseRequest, auditLog } from "@/lib/security";
import { prisma } from "@/lib/prisma";
import { aidenConfig } from "@/../aiden.config";

export const POST = withAuth(async (req, { session }) => {
  if (!aidenConfig.auth.providers.credentials) {
    return NextResponse.json(
      { error: "Password sign-in is disabled", code: "credentials_disabled" },
      { status: 403 }
    );
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 415 }
    );
  }

  const body = await parseRequest(req, changePasswordSchema);

  try {
    await changePassword(
      prisma,
      session.user.id,
      body.currentPassword,
      body.newPassword
    );
  } catch (err) {
    if (err instanceof PasswordChangeError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    throw err;
  }

  auditLog({
    event: "password.change",
    actorId: session.user.id,
    resourceId: session.user.id,
  });

  return NextResponse.json({ ok: true });
});
