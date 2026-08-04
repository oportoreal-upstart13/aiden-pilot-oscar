import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, parseRequest, assertCan, auditLog } from "@/lib/security";
import { abilities } from "@/lib/abilities";
import { prisma } from "@/lib/prisma";

const rolesSchema = z.object({
  roles: z.array(z.string().min(1)).max(20),
});

const ADMIN_ROLE = "admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const PATCH = withAuth<Promise<{ id: string }>>(
  async (req, { session, params }) => {
    assertCan(abilities, session, "users.manage");

    const ct = req.headers.get("content-type") ?? "";
    if (!ct.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415 }
      );
    }

    const { id } = await params;
    const { roles } = await parseRequest(req, rolesSchema);

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        roles: { select: { name: true } },
      },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentlyAdmin = target.roles.some((r) => r.name === ADMIN_ROLE);
    const willBeAdmin = roles.includes(ADMIN_ROLE);

    if (currentlyAdmin && !willBeAdmin) {
      const adminCount = await prisma.user.count({
        where: { roles: { some: { name: ADMIN_ROLE } } },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error: "Cannot remove admin role from the last admin",
            code: "last_admin",
          },
          { status: 409 }
        );
      }
    }

    const existing = await prisma.role.findMany({
      where: { name: { in: roles } },
      select: { name: true },
    });
    if (existing.length !== roles.length) {
      const known = new Set(existing.map((r) => r.name));
      const missing = roles.filter((r) => !known.has(r));
      return NextResponse.json(
        { error: `Unknown roles: ${missing.join(", ")}`, code: "unknown_role" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        roles: { set: roles.map((name) => ({ name })) },
      },
      select: {
        id: true,
        email: true,
        name: true,
        roles: { select: { name: true } },
      },
    });

    auditLog({
      event: "roles.assign",
      actorId: session.user.id,
      resourceId: id,
      metadata: { roles },
    });

    return NextResponse.json({ ok: true, user });
  }
) as (_req: Request, ctx: RouteParams) => Promise<Response>;
