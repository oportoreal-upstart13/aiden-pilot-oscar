import { NextResponse } from "next/server";
import { assertCan, parseQuery } from "@/lib/security";
import { withAuthRoute } from "@/lib/routes";
import { abilities } from "@/lib/abilities";
import { prisma } from "@/lib/prisma";
import { resolveActiveOrg } from "@/lib/org";
import { ListUsageQuery } from "@/lib/validations/orgs";

/**
 * AI spend for the caller's active organization, broken down per user.
 *
 * Every figure is aggregated in the database rather than summed from a
 * truncated page, so the totals stay correct however the recent-calls
 * list is bounded.
 *
 * `costUsd` is a `Decimal(10,6)` and the driver adapter returns it as a
 * `Prisma.Decimal`, which does not round-trip through
 * `NextResponse.json()` — it serialises as an object, not a number. Every
 * one is converted explicitly with `Number(...)` below. The conversion is
 * safe at these magnitudes; a build that accumulated large balances would
 * want to keep the decimal as a string instead.
 */
export const GET = withAuthRoute(async (req, { session }) => {
  const query = parseQuery(req, ListUsageQuery);
  const membership = await resolveActiveOrg(session.user.id);
  assertCan(abilities, session, "org.usage.read", membership);

  const where = { orgId: membership.orgId };

  const [total, perUser, recent] = await Promise.all([
    prisma.aIUsage.aggregate({
      where,
      _count: { _all: true },
      _sum: { promptTokens: true, completionTokens: true, costUsd: true },
    }),
    prisma.aIUsage.groupBy({
      by: ["userId"],
      where,
      _count: { _all: true },
      _sum: { promptTokens: true, completionTokens: true, costUsd: true },
    }),
    prisma.aIUsage.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit,
      select: {
        id: true,
        userId: true,
        route: true,
        provider: true,
        model: true,
        promptTokens: true,
        completionTokens: true,
        costUsd: true,
        createdAt: true,
      },
    }),
  ]);

  // Names for the breakdown. Scoped to the ids that actually appear in
  // this organization's usage, so it cannot become a user directory.
  const users = await prisma.user.findMany({
    where: { id: { in: perUser.map((row) => row.userId) } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((user) => [user.id, user]));

  return NextResponse.json({
    orgId: membership.orgId,
    total: {
      calls: total._count._all,
      promptTokens: total._sum.promptTokens ?? 0,
      completionTokens: total._sum.completionTokens ?? 0,
      costUsd: Number(total._sum.costUsd ?? 0),
    },
    perUser: perUser
      .map((row) => ({
        userId: row.userId,
        name: byId.get(row.userId)?.name ?? null,
        email: byId.get(row.userId)?.email ?? null,
        calls: row._count._all,
        promptTokens: row._sum.promptTokens ?? 0,
        completionTokens: row._sum.completionTokens ?? 0,
        costUsd: Number(row._sum.costUsd ?? 0),
      }))
      .sort((a, b) => b.costUsd - a.costUsd),
    recent: recent.map((row) => ({
      ...row,
      costUsd: Number(row.costUsd),
    })),
  });
});
