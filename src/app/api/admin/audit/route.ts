import { NextResponse } from "next/server";
import { withAuth, assertCan } from "@/lib/security";
import { auditReader } from "@/lib/audit";
import { abilities } from "@/lib/abilities";

const MAX_LIMIT = 200;

export const GET = withAuth(async (req, { session }) => {
  assertCan(abilities, session, "audit.read");

  const url = new URL(req.url);
  const limit = clamp(
    parseInt(url.searchParams.get("limit") ?? "50", 10),
    1,
    MAX_LIMIT
  );
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const event = url.searchParams.get("event") ?? undefined;
  const userId = url.searchParams.get("userId") ?? undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const page = await auditReader.list({
    limit,
    cursor,
    event,
    userId,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });

  return NextResponse.json(page);
});

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(Math.max(n, lo), hi);
}
