import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const setting = await prisma.appSetting.findUnique({
    where: { key: "booking_window_days" },
  });

  console.log("Booking window days:", setting?.value || "Not found");

  await prisma.$disconnect();
}

main();
