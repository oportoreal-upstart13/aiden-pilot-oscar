import { NextResponse } from "next/server";
import { withAuth, assertCan } from "@/lib/security";
import { abilities } from "@/lib/abilities";
import { prisma } from "@/lib/prisma";

const MAX_LIMIT = 100;

export const GET = withAuth(async (req, { session }) => {
  assertCan(abilities, session, "users.manage");

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = clamp(
    parseInt(url.searchParams.get("limit") ?? "25", 10),
    1,
    MAX_LIMIT
  );

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
      roles: { select: { name: true } },
    },
  });

  const hasMore = users.length > limit;
  const rows = hasMore ? users.slice(0, limit) : users;
  const nextCursor = hasMore ? rows[rows.length - 1]!.id : null;

  return NextResponse.json({ users: rows, nextCursor });
});

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(Math.max(n, lo), hi);
}
