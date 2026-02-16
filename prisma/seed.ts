import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create courts - Only 2 identical courts
  const courts = await Promise.all([
    prisma.court.upsert({
      where: { id: "court-1" },
      update: {
        name: "Court 1",
        description: "Indoor court with premium surface",
        isIndoor: true,
        hasLighting: true,
        surfaceType: "SportCourt",
        pricePerHourCents: 3000, // $30/hr
        peakPricePerHourCents: 4000, // $40/hr peak
        openTime: "07:00",
        closeTime: "22:00",
        slotDurationMinutes: 60,
        isActive: true,
        sortOrder: 1,
      },
      create: {
        id: "court-1",
        name: "Court 1",
        description: "Indoor court with premium surface",
        isIndoor: true,
        hasLighting: true,
        surfaceType: "SportCourt",
        pricePerHourCents: 3000, // $30/hr
        peakPricePerHourCents: 4000, // $40/hr peak
        openTime: "07:00",
        closeTime: "22:00",
        slotDurationMinutes: 60,
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.court.upsert({
      where: { id: "court-2" },
      update: {
        name: "Court 2",
        description: "Indoor court with premium surface",
        isIndoor: true,
        hasLighting: true,
        surfaceType: "SportCourt",
        pricePerHourCents: 3000,
        peakPricePerHourCents: 4000,
        openTime: "07:00",
        closeTime: "22:00",
        slotDurationMinutes: 60,
        isActive: true,
        sortOrder: 2,
      },
      create: {
        id: "court-2",
        name: "Court 2",
        description: "Indoor court with premium surface",
        isIndoor: true,
        hasLighting: true,
        surfaceType: "SportCourt",
        pricePerHourCents: 3000,
        peakPricePerHourCents: 4000,
        openTime: "07:00",
        closeTime: "22:00",
        slotDurationMinutes: 60,
        isActive: true,
        sortOrder: 2,
      },
    }),
    // Deactivate old courts if they exist
    prisma.court.upsert({
      where: { id: "court-3" },
      update: { isActive: false },
      create: {
        id: "court-3",
        name: "Court 3 (Inactive)",
        description: "Deactivated court",
        isIndoor: false,
        hasLighting: true,
        surfaceType: "Concrete",
        pricePerHourCents: 2000,
        peakPricePerHourCents: 2500,
        openTime: "07:00",
        closeTime: "21:00",
        slotDurationMinutes: 60,
        isActive: false,
        sortOrder: 3,
      },
    }),
    prisma.court.upsert({
      where: { id: "court-4" },
      update: { isActive: false },
      create: {
        id: "court-4",
        name: "Court 4 (Inactive)",
        description: "Deactivated court",
        isIndoor: false,
        hasLighting: true,
        surfaceType: "Concrete",
        pricePerHourCents: 2000,
        peakPricePerHourCents: 2500,
        openTime: "07:00",
        closeTime: "21:00",
        slotDurationMinutes: 60,
        isActive: false,
        sortOrder: 4,
      },
    }),
  ]);

  console.log(`Created ${courts.length} courts`);

  // Create app settings
  const settings = await Promise.all([
    prisma.appSetting.upsert({
      where: { key: "booking_window_days" },
      update: {},
      create: {
        key: "booking_window_days",
        value: "7",
        description: "Number of days in advance users can book",
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "max_consecutive_slots" },
      update: {},
      create: {
        key: "max_consecutive_slots",
        value: "3",
        description: "Maximum number of consecutive hours per booking",
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "payment_timeout_minutes" },
      update: {},
      create: {
        key: "payment_timeout_minutes",
        value: "10",
        description: "Minutes before unpaid booking expires",
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "peak_hours_start" },
      update: {},
      create: {
        key: "peak_hours_start",
        value: "18:00",
        description: "Peak pricing starts (SGT)",
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "peak_hours_end" },
      update: {},
      create: {
        key: "peak_hours_end",
        value: "21:00",
        description: "Peak pricing ends (SGT)",
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "weekend_is_peak" },
      update: {},
      create: {
        key: "weekend_is_peak",
        value: "true",
        description: "Whether weekends use peak pricing all day",
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "facility_name" },
      update: {},
      create: {
        key: "facility_name",
        value: "PickleSG",
        description: "Name of the facility",
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "facility_address" },
      update: {},
      create: {
        key: "facility_address",
        value: "123 Pickleball Lane, Singapore 123456",
        description: "Physical address of the facility",
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "cancellation_policy_hours" },
      update: {},
      create: {
        key: "cancellation_policy_hours",
        value: "24",
        description: "Hours before booking when cancellation is free",
      },
    }),
  ]);

  console.log(`Created ${settings.length} app settings`);

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
