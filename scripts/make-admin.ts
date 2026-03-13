/**
 * Make a user an admin by email.
 * Usage: npx tsx scripts/make-admin.ts your@email.com
 */

import path from "path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/make-admin.ts your@email.com");
    process.exit(1);
  }

  // Dynamic imports for ESM compatibility
  const { PrismaClient } = await import("../src/generated/prisma/client.js");

  const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
  const normalizedPath = dbPath.replace(/\\/g, "/");
  const adapter = new PrismaBetterSqlite3({ url: `file:${normalizedPath}` });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma = new PrismaClient({ adapter: adapter as any });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌ No user found with email: ${email}`);
    console.error("Make sure you have registered first at http://localhost:3000/register");
    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: { role: "admin" },
  });

  console.log(`✅ ${email} is now an admin!`);
  console.log(`   Go to: http://localhost:3000/admin`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
