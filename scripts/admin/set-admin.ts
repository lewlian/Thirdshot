// Set a user as admin
// Run with: npx tsx scripts/set-admin.ts <email>

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: npx tsx scripts/set-admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`User with email "${email}" not found`);
    process.exit(1);
  }

  if (user.role === "ADMIN") {
    console.log(`User "${email}" is already an admin`);
    process.exit(0);
  }

  await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log(`Successfully set "${email}" as admin`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
