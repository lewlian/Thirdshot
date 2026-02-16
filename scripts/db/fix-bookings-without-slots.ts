import { addHours, addDays } from 'date-fns';

// Dynamically import to ensure env vars are loaded
async function fixBookingsWithoutSlots() {
  // Load Next.js environment variables
  const { loadEnvConfig } = await import('@next/env');
  const projectDir = process.cwd();
  loadEnvConfig(projectDir);

  // Now import prisma after env vars are loaded
  const { prisma } = await import('../../src/lib/prisma');

  console.log('Finding bookings without slots...');

  // Find all bookings that have no slots
  const bookingsWithoutSlots = await prisma.booking.findMany({
    where: {
      slots: {
        none: {},
      },
    },
    include: {
      slots: true,
    },
  });

  console.log(`Found ${bookingsWithoutSlots.length} bookings without slots`);

  if (bookingsWithoutSlots.length === 0) {
    console.log('No bookings to fix!');
    return;
  }

  // Get the first available court
  const court = await prisma.court.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  if (!court) {
    console.error('No active court found!');
    return;
  }

  console.log(`Using court: ${court.name}`);

  // Fix each booking by adding a placeholder slot
  for (const booking of bookingsWithoutSlots) {
    console.log(`\nFixing booking ${booking.id}...`);
    console.log(`  Status: ${booking.status}`);
    console.log(`  Created: ${booking.createdAt}`);

    // Use the booking creation date + 1 day as the slot time
    // This makes sense as a "past" booking
    const slotStart = addDays(booking.createdAt, 1);
    const slotEnd = addHours(slotStart, 1); // 1 hour slot

    try {
      await prisma.bookingSlot.create({
        data: {
          bookingId: booking.id,
          courtId: court.id,
          startTime: slotStart,
          endTime: slotEnd,
          priceInCents: booking.totalCents, // Use the booking's total as the slot price
        },
      });

      console.log(`  ✓ Added slot: ${slotStart.toISOString()} - ${slotEnd.toISOString()}`);
    } catch (error) {
      console.error(`  ✗ Failed to add slot:`, error);
    }
  }

  console.log('\n✓ Done!');

  await prisma.$disconnect();
}

fixBookingsWithoutSlots()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
