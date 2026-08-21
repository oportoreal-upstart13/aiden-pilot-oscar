import { NextResponse } from "next/server";
import { auditLog, parseRequest } from "@/lib/security";
import { withAuthRoute } from "@/lib/routes";
import { prisma } from "@/lib/prisma";
import {
  ORG_COOKIE_NAME,
  ORG_COOKIE_OPTIONS,
  assertOrgVisible,
  resolveActiveOrg,
} from "@/lib/org";
import { SwitchOrgBody } from "@/lib/validations/orgs";

/**
 * Switch the caller's active organization.
 *
 * A membership question, not a role question: any role may switch to an
 * organization they belong to. The `Membership` read is scoped by
 * `userId`, so a target the caller does not belong to comes back `null`
 * and `assertOrgVisible` turns it into the same 404 as a target that does
 * not exist — switching towards another tenant reveals nothing about
 * whether it is real.
 *
 * The cookie this sets is untrusted on the way back in: `resolveActiveOrg`
 * re-verifies it against `Membership` on every request, so a forged value
 * grants nothing.
 */
export const POST = withAuthRoute(async (req, { session }) => {
  const { orgId } = await parseRequest(req, SwitchOrgBody);
  const current = await resolveActiveOrg(session.user.id);

  const target = await prisma.membership.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
    select: { id: true, orgId: true, userId: true },
  });

  assertOrgVisible(target, session.user.id);

  auditLog({
    event: "org.switch",
    resourceId: target.orgId,
    metadata: { fromOrgId: current.orgId, toOrgId: target.orgId },
  });

  const response = NextResponse.json({ activeOrgId: target.orgId });
  response.cookies.set(ORG_COOKIE_NAME, target.orgId, ORG_COOKIE_OPTIONS);
  return response;
});
