import path from "path";

// Dynamic import to avoid build errors when generated client doesn't exist yet
// Run `npx prisma generate` if you get module not found errors

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prismaInstance: any;

function getPrismaClient() {
  if (prismaInstance) return prismaInstance;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require("@/generated/prisma/client");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

    const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
    // Normalize path for Windows (replace backslashes)
    const normalizedPath = dbPath.replace(/\\/g, "/");
    const adapter = new PrismaBetterSqlite3({ url: `file:${normalizedPath}` });
    prismaInstance = new PrismaClient({ adapter });
    return prismaInstance;
  } catch (err) {
    console.error(
      "❌ Prisma client not found. Run: npx prisma generate && npx prisma db push",
      err
    );
    throw new Error(
      "Database not initialized. Run: npx prisma generate && npx prisma db push"
    );
  }
}

const globalForPrisma = globalThis as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any | undefined;
};

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
