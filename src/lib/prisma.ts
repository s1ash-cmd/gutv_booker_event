import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

function createPrismaClient() {
  const accelerateUrl = process.env.PRISMA_DATABASE_URL;

  if (!accelerateUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  return new PrismaClient({
    accelerateUrl,
  }).$extends(withAccelerate());
}

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
