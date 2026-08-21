/**
 * Seed default roles + permissions used by the starter's RBAC layer.
 *
 * Run via `prisma db seed` (configured in package.json's `prisma` field).
 * Idempotent — re-running just upserts existing rows.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ROLES, PERMISSIONS } from "../src/config/rbac";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      create: perm,
      update: { description: perm.description },
    });
  }

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      create: {
        name: role.name,
        description: role.description,
        permissions: {
          connect: role.permissions.map((key) => ({ key })),
        },
      },
      update: {
        description: role.description,
        permissions: {
          set: role.permissions.map((key) => ({ key })),
        },
      },
    });
  }

  console.log("✓ seeded roles + permissions");
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
