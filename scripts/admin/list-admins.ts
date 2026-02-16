import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL,
});

const prisma = new PrismaClient({ adapter });

async function listAdmins() {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (admins.length === 0) {
      console.log("\n❌ No admins found in the database.\n");
      return;
    }

    console.log(`\n✅ Found ${admins.length} admin(s):\n`);
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name || "No name"}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Created: ${admin.createdAt.toLocaleString()}`);
      console.log(`   Last Login: ${admin.lastLoginAt ? admin.lastLoginAt.toLocaleString() : "Never"}`);
      console.log("");
    });
  } catch (error) {
    console.error("Error fetching admins:", error);
  } finally {
    await prisma.$disconnect();
  }
}

listAdmins();
