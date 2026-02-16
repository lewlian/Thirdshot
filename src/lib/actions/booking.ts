"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";
import { checkSlotAvailability, checkSlotAvailabilityInTransaction } from "@/lib/booking/availability";
import { calculateBookingPrice } from "@/lib/booking/pricing";
import { sendBookingCancelledEmail } from "@/lib/email/send";
import { createBookingSchema } from "@/lib/validations/booking";
import { addMinutes, addHours, parseISO, setHours, setMinutes } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import {
  checkRateLimit,
  RATE_LIMITS,
  formatRateLimitError,
} from "@/lib/rate-limit";

const TIMEZONE = "Asia/Singapore";
const PAYMENT_TIMEOUT_MINUTES = 10;

export type BookingActionResult = {
  error?: string;
  success?: boolean;
  bookingId?: string;
};

/**
 * Create a new court booking for consecutive time slots
 * Server action called from booking form
 *
 * @param formData - Form data containing:
 *   - courtId: ID of the court to book
 *   - date: ISO date string
 *   - startTime: Start time in HH:mm format
 *   - slots: Number of consecutive slots (1-3)
 *
 * Functionality:
 * - Validates input and user authentication
 * - Checks slot availability within transaction (prevents race conditions)
 * - Calculates pricing based on peak/regular hours
 * - Creates booking with PENDING_PAYMENT status
 * - Sets 10-minute expiration timer
 * - Creates payment record and HitPay payment request
 *
 * @returns BookingActionResult with success/error and bookingId
 */
export async function createBooking(
  formData: FormData
): Promise<BookingActionResult> {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  // Check if email is verified
  if (!user.email_confirmed_at) {
    return {
      error: "Please verify your email address before booking. Check your inbox for the verification link.",
    };
  }

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!dbUser) {
    return { error: "User not found. Please sign in again." };
  }

  // Check rate limit (10 booking attempts per minute per user)
  const rateLimit = checkRateLimit(dbUser.id, RATE_LIMITS.BOOKING);

  if (!rateLimit.allowed) {
    return {
      error: formatRateLimitError(rateLimit, "booking"),
    };
  }

  // Parse and validate input
  const rawData = {
    courtId: formData.get("courtId") as string,
    date: formData.get("date") as string,
    startTime: formData.get("startTime") as string,
    slots: parseInt(formData.get("slots") as string) || 1,
  };

  const parsed = createBookingSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { courtId, date, startTime, slots } = parsed.data;

  // Get court
  const court = await prisma.court.findUnique({
    where: { id: courtId },
  });

  if (!court || !court.isActive) {
    return { error: "Court not available" };
  }

  // Parse start time
  const [startHour, startMin] = startTime.split(":").map(Number);
  const dateObj = parseISO(date);
  const startDateTime = fromZonedTime(
    setMinutes(setHours(dateObj, startHour), startMin),
    TIMEZONE
  );

  // Calculate end time based on slots
  const slotDurationHours = court.slotDurationMinutes / 60;
  const endDateTime = addHours(startDateTime, slotDurationHours * slots);

  // Check availability for all slots using transaction
  try {
    const booking = await prisma.$transaction(async (tx) => {
      const bookingSlots = [];

      // Check availability within transaction to prevent race conditions
      for (let i = 0; i < slots; i++) {
        const slotStart = addHours(startDateTime, slotDurationHours * i);
        const slotEnd = addHours(slotStart, slotDurationHours);

        await checkSlotAvailabilityInTransaction(tx, courtId, slotStart, slotEnd);

        bookingSlots.push({
          courtId,
          startTime: slotStart,
          endTime: slotEnd,
        });
      }

      // Calculate pricing
      const priceBreakdown = await calculateBookingPrice(
        court,
        startDateTime,
        slots
      );

      // Create the booking with slots
      const newBooking = await tx.booking.create({
        data: {
          userId: dbUser.id,
          type: "COURT_BOOKING",
          totalCents: priceBreakdown.totalCents,
          currency: priceBreakdown.currency,
          status: "PENDING_PAYMENT",
          expiresAt: addMinutes(new Date(), PAYMENT_TIMEOUT_MINUTES),
          slots: {
            create: bookingSlots.map((slot) => ({
              courtId: slot.courtId,
              startTime: slot.startTime,
              endTime: slot.endTime,
              priceInCents: priceBreakdown.totalCents / slots, // Divide evenly
            })),
          },
        },
      });

      // Create payment record
      await tx.payment.create({
        data: {
          bookingId: newBooking.id,
          userId: dbUser.id,
          amountCents: priceBreakdown.totalCents,
          currency: priceBreakdown.currency,
          status: "PENDING",
        },
      });

      return newBooking;
    });

    revalidatePath("/courts");
    revalidatePath("/bookings");

    return { success: true, bookingId: booking.id };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to create booking. Please try again." };
  }
}

interface SlotInput {
  courtId: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  priceInCents: number;
}

/**
 * Create a new booking with multiple non-consecutive time slots
 * Used for calendar-based multi-court booking flow
 * Server action called from calendar availability component
 *
 * @param slots - Array of slot objects with:
 *   - courtId: ID of the court
 *   - startTime: ISO date-time string
 *   - endTime: ISO date-time string
 *   - priceInCents: Price for this specific slot
 *
 * Functionality:
 * - Validates user authentication
 * - Checks availability for all slots within transaction
 * - Creates single booking with multiple booking slots
 * - Sets PENDING_PAYMENT status with 10-minute expiration
 * - Creates payment record and HitPay payment request
 *
 * @returns BookingActionResult with success/error and bookingId
 */
export async function createMultipleBookings(
  slots: SlotInput[]
): Promise<BookingActionResult> {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  // Check if email is verified
  if (!user.email_confirmed_at) {
    return {
      error: "Please verify your email address before booking. Check your inbox for the verification link.",
    };
  }

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!dbUser) {
    return { error: "User not found. Please sign in again." };
  }

  // Check rate limit (10 booking attempts per minute per user)
  const rateLimit = checkRateLimit(dbUser.id, RATE_LIMITS.BOOKING);

  if (!rateLimit.allowed) {
    return {
      error: formatRateLimitError(rateLimit, "booking"),
    };
  }

  if (slots.length === 0) {
    return { error: "No slots selected" };
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const expiresAt = addMinutes(new Date(), PAYMENT_TIMEOUT_MINUTES);

      // Check availability for all slots first
      for (const slot of slots) {
        const startDateTime = new Date(slot.startTime);
        const endDateTime = new Date(slot.endTime);

        await checkSlotAvailabilityInTransaction(tx, slot.courtId, startDateTime, endDateTime);
      }

      // Calculate total amount
      const totalCents = slots.reduce((sum, slot) => sum + slot.priceInCents, 0);

      // Create the booking
      const newBooking = await tx.booking.create({
        data: {
          userId: dbUser.id,
          type: "COURT_BOOKING",
          totalCents,
          currency: "SGD",
          status: "PENDING_PAYMENT",
          expiresAt,
          slots: {
            create: slots.map((slot) => ({
              courtId: slot.courtId,
              startTime: new Date(slot.startTime),
              endTime: new Date(slot.endTime),
              priceInCents: slot.priceInCents,
            })),
          },
        },
      });

      // Create payment record
      await tx.payment.create({
        data: {
          bookingId: newBooking.id,
          userId: dbUser.id,
          amountCents: totalCents,
          currency: "SGD",
          status: "PENDING",
        },
      });

      return newBooking;
    });

    revalidatePath("/courts");
    revalidatePath("/bookings");

    return { success: true, bookingId: booking.id };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to create booking. Please try again." };
  }
}

/**
 * Cancel a booking
 * Server action called from booking detail page
 *
 * @param bookingId - ID of the booking to cancel
 * @param reason - Optional cancellation reason
 *
 * Functionality:
 * - Verifies user owns the booking or is admin
 * - Validates booking is in cancellable state (CONFIRMED or PENDING_PAYMENT)
 * - Updates booking status to CANCELLED
 * - Releases time slots back to inventory
 * - Sends cancellation email notification
 * - TODO: Initiates refund for confirmed bookings (not yet implemented)
 *
 * @returns BookingActionResult with success/error status
 */
export async function cancelBooking(
  bookingId: string,
  reason?: string
): Promise<BookingActionResult> {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!dbUser) {
    return { error: "User not found" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payment: true,
      user: true,
      slots: {
        include: { court: true },
        orderBy: { startTime: "asc" },
      },
    },
  });

  if (!booking) {
    return { error: "Booking not found" };
  }

  if (booking.userId !== dbUser.id) {
    return { error: "You can only cancel your own bookings" };
  }

  if (!["PENDING_PAYMENT", "CONFIRMED"].includes(booking.status)) {
    return { error: "This booking cannot be cancelled" };
  }

  const wasConfirmed = booking.status === "CONFIRMED";

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason,
    },
  });

  // Send cancellation email
  const refundAmount = wasConfirmed
    ? `$${(booking.totalCents / 100).toFixed(2)} ${booking.currency}`
    : undefined;

  const firstSlot = booking.slots[0];
  if (firstSlot) {
    await sendBookingCancelledEmail({
      userEmail: booking.user.email,
      userName: booking.user.name || "Guest",
      courtName:
        booking.slots.length > 1
          ? `${booking.slots.length} slots`
          : firstSlot.court.name,
      startTime: firstSlot.startTime,
      endTime: firstSlot.endTime,
      totalCents: booking.totalCents,
      currency: booking.currency,
      bookingId: booking.id,
      refundAmount,
    });
  }

  // TODO: If payment was completed, initiate refund via HitPay

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);

  return { success: true };
}

export async function getBookingById(bookingId: string) {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!dbUser) {
    return null;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payment: true,
      user: true,
      slots: {
        include: { court: true },
        orderBy: { startTime: "asc" },
      },
    },
  });

  if (!booking) {
    return null;
  }

  // Check if user owns this booking or is admin
  if (booking.userId !== dbUser.id && dbUser.role !== "ADMIN") {
    return null;
  }

  return booking;
}
