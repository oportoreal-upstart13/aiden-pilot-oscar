import { exportUserData } from "@upstart13-com/aiden-auth";
import { withAuth, auditLog } from "@/lib/security";
import { prisma } from "@/lib/prisma";
import { brand } from "@/config/brand";

/** Slugify the brand name for use in a download filename. */
function brandSlug(): string {
  const slug = brand.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "export";
}

export const POST = withAuth(async (_req, { session }) => {
  const data = await exportUserData(prisma, session.user.id);

  auditLog({
    event: "data.export",
    actorId: session.user.id,
    resourceId: session.user.id,
  });

  const filename = `${brandSlug()}-export-${session.user.id}.json`;
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
