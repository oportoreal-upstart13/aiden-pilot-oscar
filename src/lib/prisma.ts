import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createPrismaClient } from "@upstart13-com/aiden-db";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma = createPrismaClient(PrismaClient, { adapter });
