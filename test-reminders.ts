/**
 * Test script to check database and manually trigger reminder emails
 * Run with: npx tsx test-reminders.ts
 */

import { prisma } from './src/lib/prisma';
import { addHours } from 'date-fns';

async function testReminders() {
  console.log('🔍 Checking database for bookings...\n');

  const now = new Date();
  const reminderWindowStart = addHours(now, 22);
  const reminderWindowEnd = addHours(now, 26);

  console.log('Current time:', now.toISOString());
  console.log('Looking for bookings between:');
  console.log('  Start:', reminderWindowStart.toISOString());
  console.log('  End:', reminderWindowEnd.toISOString());
  console.log('');

  // Check all confirmed bookings
  const confirmedBookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
    },
    include: {
      user: true,
      slots: {
        include: {
          court: true,
        },
        orderBy: {
          startTime: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  console.log(`📋 Found ${confirmedBookings.length} total CONFIRMED bookings\n`);

  if (confirmedBookings.length === 0) {
    console.log('❌ No confirmed bookings found in database');
    console.log('💡 Create a booking via the app first, then run this script again\n');
    return;
  }

  // Show all confirmed bookings
  confirmedBookings.forEach((booking) => {
    const firstSlot = booking.slots[0];
    if (firstSlot) {
      const reminderSent = booking.reminderSentAt ? '✅' : '❌';
      console.log(`${reminderSent} Booking ${booking.id.substring(0, 8)}...`);
      console.log(`   User: ${booking.user.email}`);
      console.log(`   Court: ${firstSlot.court.name}`);
      console.log(`   Start: ${firstSlot.startTime.toISOString()}`);
      console.log(`   Reminder sent: ${booking.reminderSentAt?.toISOString() || 'No'}`);
      console.log('');
    }
  });

  // Check bookings in the 24-hour reminder window
  const bookingsInWindow = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      reminderSentAt: null,
      slots: {
        some: {
          startTime: {
            gte: reminderWindowStart,
            lte: reminderWindowEnd,
          },
        },
      },
    },
    include: {
      user: true,
      slots: {
        include: {
          court: true,
        },
      },
    },
  });

  console.log('🎯 Bookings eligible for reminders (in 22-26 hour window):');
  console.log(`   Found: ${bookingsInWindow.length}\n`);

  if (bookingsInWindow.length === 0) {
    console.log('❌ No bookings found in the 24-hour reminder window');
    console.log('');
    console.log('💡 To test the reminder system:');
    console.log('   1. Create a booking that starts ~24 hours from now');
    console.log('   2. Or temporarily modify the time window in the cron endpoint');
    console.log('');
    console.log('🧪 Test with wider time window:');
    console.log('   Edit: src/app/api/cron/send-reminders/route.ts');
    console.log('   Change: const reminderWindowStart = subHours(now, 48);');
    console.log('   Change: const reminderWindowEnd = addHours(now, 72);');
    console.log('');
  } else {
    bookingsInWindow.forEach((booking) => {
      const firstSlot = booking.slots[0];
      if (firstSlot) {
        console.log(`✅ ${booking.id.substring(0, 8)}... - ${booking.user.email}`);
        console.log(`   ${firstSlot.court.name} at ${firstSlot.startTime.toISOString()}`);
      }
    });
    console.log('');
    console.log('✨ Ready to test! Run: curl http://localhost:3000/api/cron/send-reminders');
  }

  await prisma.$disconnect();
}

testReminders().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
