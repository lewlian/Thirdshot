import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingReminderEmail } from "@/lib/email/send";
import { addHours, subHours } from "date-fns";

/**
 * Cron endpoint to send booking reminder emails
 * Called by Vercel Cron daily (configured in vercel.json)
 *
 * @route GET /api/cron/send-reminders
 * @access Protected by optional CRON_SECRET environment variable
 *
 * Functionality:
 * - Finds all CONFIRMED bookings starting in ~24 hours
 * - Only sends reminders if reminderSentAt is null (no duplicate reminders)
 * - Sends reminder email to user
 * - Updates reminderSentAt timestamp
 *
 * Request headers:
 * - Authorization: Bearer {CRON_SECRET} (optional)
 *
 * Response:
 * - 200: { message, remindersSent, bookingIds }
 * - 401: Unauthorized (invalid CRON_SECRET)
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (optional but recommended for production)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find bookings starting in the next 24-26 hours
    // We use a 2-hour window to account for cron timing variations
    // If cron runs daily at midnight SGT, this catches bookings for tomorrow
    const reminderWindowStart = addHours(now, 22); // 22 hours from now
    const reminderWindowEnd = addHours(now, 26);   // 26 hours from now

    console.log("Send reminders cron job started", {
      now: now.toISOString(),
      reminderWindowStart: reminderWindowStart.toISOString(),
      reminderWindowEnd: reminderWindowEnd.toISOString(),
    });

    // Find all confirmed bookings in the reminder window that haven't received a reminder yet
    const bookingsNeedingReminders = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        reminderSentAt: null, // Only bookings that haven't received a reminder
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
          orderBy: {
            startTime: "asc",
          },
        },
      },
    });

    if (bookingsNeedingReminders.length === 0) {
      console.log("No bookings need reminders at this time");
      return NextResponse.json({
        message: "No bookings need reminders",
        remindersSent: 0,
      });
    }

    console.log(`Found ${bookingsNeedingReminders.length} bookings needing reminders`);

    // Send reminders and track results
    const reminderResults = await Promise.allSettled(
      bookingsNeedingReminders.map(async (booking) => {
        // Get the first slot for the booking (earliest start time)
        const firstSlot = booking.slots[0];
        const lastSlot = booking.slots[booking.slots.length - 1];

        if (!firstSlot || !lastSlot) {
          console.warn(`Booking ${booking.id} has no slots, skipping`);
          return null;
        }

        // Get court name (all slots should be from the same booking, take first court name)
        const courtName = firstSlot.court.name;

        // Build booking URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const bookingUrl = `${appUrl}/bookings/${booking.id}`;

        // Send reminder email
        const emailSent = await sendBookingReminderEmail({
          userEmail: booking.user.email,
          userName: booking.user.name || "Player",
          courtName,
          startTime: firstSlot.startTime,
          endTime: lastSlot.endTime,
          totalCents: booking.totalCents,
          currency: booking.currency,
          bookingId: booking.id,
          bookingUrl,
        });

        if (emailSent) {
          // Update booking to mark reminder as sent
          await prisma.booking.update({
            where: { id: booking.id },
            data: { reminderSentAt: now },
          });

          console.log(`Reminder sent successfully for booking ${booking.id}`);
          return booking.id;
        } else {
          console.error(`Failed to send reminder for booking ${booking.id}`);
          return null;
        }
      })
    );

    // Count successful reminders
    const successfulReminders = reminderResults
      .filter((result) => result.status === "fulfilled" && result.value !== null)
      .map((result) => (result as PromiseFulfilledResult<string | null>).value)
      .filter((id): id is string => id !== null);

    const failedCount = reminderResults.length - successfulReminders.length;

    console.log("Send reminders cron job completed", {
      totalBookings: bookingsNeedingReminders.length,
      remindersSent: successfulReminders.length,
      failed: failedCount,
    });

    return NextResponse.json({
      message: `Sent ${successfulReminders.length} reminder(s)`,
      remindersSent: successfulReminders.length,
      failed: failedCount,
      bookingIds: successfulReminders,
    });
  } catch (error) {
    console.error("Error sending booking reminders:", error);
    return NextResponse.json(
      { error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
