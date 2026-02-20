import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendBookingReminderEmail } from "@/lib/email/send";
import { addHours } from "date-fns";

/**
 * Cron endpoint to send booking reminder emails
 * Called by Vercel Cron daily (configured in vercel.json)
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
    const adminClient = createAdminSupabaseClient();

    // Find bookings starting in the next 24-26 hours
    const reminderWindowStart = addHours(now, 22);
    const reminderWindowEnd = addHours(now, 26);

    console.log("Send reminders cron job started", {
      now: now.toISOString(),
      reminderWindowStart: reminderWindowStart.toISOString(),
      reminderWindowEnd: reminderWindowEnd.toISOString(),
    });

    // Find all confirmed bookings that haven't received a reminder
    // with slots in the reminder window
    // Since Supabase can't do nested relation filters like Prisma's `some`,
    // we fetch confirmed bookings without reminders and filter in JS
    const { data: bookings } = await adminClient
      .from('bookings')
      .select('*, users(*), booking_slots(*, courts(*))')
      .eq('status', 'CONFIRMED')
      .is('reminder_sent_at', null);

    if (!bookings || bookings.length === 0) {
      console.log("No bookings need reminders at this time");
      return NextResponse.json({
        message: "No bookings need reminders",
        remindersSent: 0,
      });
    }

    // Filter to bookings with slots in the reminder window
    const bookingsNeedingReminders = bookings.filter((booking) => {
      return booking.booking_slots.some((slot) => {
        const slotStart = new Date(slot.start_time);
        return slotStart >= reminderWindowStart && slotStart <= reminderWindowEnd;
      });
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
        const sortedSlots = [...booking.booking_slots].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
        const firstSlot = sortedSlots[0];
        const lastSlot = sortedSlots[sortedSlots.length - 1];

        if (!firstSlot || !lastSlot) {
          console.warn(`Booking ${booking.id} has no slots, skipping`);
          return null;
        }

        const courtName = firstSlot.courts.name;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const bookingUrl = `${appUrl}/bookings/${booking.id}`;

        const emailSent = await sendBookingReminderEmail({
          userEmail: booking.users.email,
          userName: booking.users.name || "Player",
          courtName,
          startTime: new Date(firstSlot.start_time),
          endTime: new Date(lastSlot.end_time),
          totalCents: booking.total_cents,
          currency: booking.currency,
          bookingId: booking.id,
          bookingUrl,
        });

        if (emailSent) {
          await adminClient
            .from('bookings')
            .update({ reminder_sent_at: now.toISOString() })
            .eq('id', booking.id);

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
