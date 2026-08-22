import { NextResponse } from "next/server";
import { assertCan, auditLog, parseRequest } from "@/lib/security";
import { withAuthIdRoute } from "@/lib/routes";
import { abilities } from "@/lib/abilities";
import { prisma } from "@/lib/prisma";
import { assertOrgResourceVisible, resolveActiveOrg } from "@/lib/org";
import { RoleChangeBody } from "@/lib/validations/orgs";

/**
 * Change a member's role within the caller's active organization.
 *
 * The perimeter runs in the canonical order. The read is org-filtered, so
 * a membership id belonging to another tenant comes back `null` and
 * `assertOrgResourceVisible` turns it into the same 404 as an id that
 * does not exist — an owner cannot discover that another organization's
 * membership is real. Only then does the ability gate run.
 *
 * The ownership step here is a presence check by design: an owner
 * administers memberships that are not their own, so comparing the row's
 * `userId` against the caller would be the wrong question.
 */
export const PATCH = withAuthIdRoute(async (req, { session, params }) => {
  const { role } = await parseRequest(req, RoleChangeBody);
  const membership = await resolveActiveOrg(session.user.id);

  const target = await prisma.membership.findFirst({
    where: { id: params.id, orgId: membership.orgId },
    select: { id: true, role: true, userId: true },
  });

  assertOrgResourceVisible(target, session.user.id);
  assertCan(abilities, session, "org.members.manage", membership);

  const fromRole = target.role;

  // Last-owner guard, following the `last_admin` precedent in the
  // starter's role route. Demoting the final owner would leave the
  // organization with nobody able to manage members, change roles, or
  // read its audit trail — and nobody able to undo it, because undoing it
  // is itself an owner-only action. An owner demoting themselves is the
  // likely way to hit this, but the check is on the outcome, not on who
  // is acting, so it also covers an owner demoting the only other one.
  if (fromRole === "owner" && role !== "owner") {
    const owners = await prisma.membership.count({
      where: { orgId: membership.orgId, role: "owner" },
    });
    if (owners <= 1) {
      return NextResponse.json(
        {
          error:
            "This is the organization's only owner. Promote someone else to owner first.",
          code: "last_owner",
        },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.membership.update({
    where: { id: target.id },
    data: { role },
    select: {
      id: true,
      role: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  auditLog({
    event: "member.role_change",
    resourceId: target.id,
    metadata: { orgId: membership.orgId, fromRole, toRole: role },
  });

  return NextResponse.json({
    member: {
      membershipId: updated.id,
      userId: updated.user.id,
      name: updated.user.name,
      email: updated.user.email,
      role: updated.role,
    },
  });
});
