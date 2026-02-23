"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkSlotAvailability, getUserDailySlotsCount } from "@/lib/booking/availability";
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
 */
export async function createBooking(
  formData: FormData
): Promise<BookingActionResult> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
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
  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_id', user.id)
    .single();

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

  // Extract org ID
  const orgId = formData.get("orgId") as string;
  if (!orgId) {
    return { error: "Organization ID is required" };
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
  const { data: court } = await supabase
    .from('courts')
    .select('*')
    .eq('id', courtId)
    .eq('organization_id', orgId)
    .single();

  if (!court || !court.is_active) {
    return { error: "Court not available" };
  }

  // Check daily slot limit
  const { data: org } = await supabase
    .from('organizations')
    .select('max_consecutive_slots')
    .eq('id', orgId)
    .single();

  const maxDailySlots = org?.max_consecutive_slots || 3;
  const dailySlotsUsed = await getUserDailySlotsCount(
    dbUser.id,
    parseISO(date),
    orgId
  );

  if (dailySlotsUsed + slots > maxDailySlots) {
    const remaining = Math.max(0, maxDailySlots - dailySlotsUsed);
    return {
      error: remaining === 0
        ? `You've reached the daily booking limit of ${maxDailySlots} slot${maxDailySlots !== 1 ? "s" : ""} for this date.`
        : `You can only book ${remaining} more slot${remaining !== 1 ? "s" : ""} on this date (${dailySlotsUsed}/${maxDailySlots} used).`,
    };
  }

  // Parse start time
  const [startHour, startMin] = startTime.split(":").map(Number);
  const dateObj = parseISO(date);
  const startDateTime = fromZonedTime(
    setMinutes(setHours(dateObj, startHour), startMin),
    TIMEZONE
  );

  // Calculate end time based on slots
  const slotDurationHours = court.slot_duration_minutes / 60;
  const endDateTime = addHours(startDateTime, slotDurationHours * slots);

  // Calculate pricing
  const priceBreakdown = await calculateBookingPrice(
    court,
    startDateTime,
    slots
  );

  // Build slots JSON for the RPC function
  const bookingSlots = [];
  for (let i = 0; i < slots; i++) {
    const slotStart = addHours(startDateTime, slotDurationHours * i);
    const slotEnd = addHours(slotStart, slotDurationHours);
    bookingSlots.push({
      court_id: courtId,
      start_time: slotStart.toISOString(),
      end_time: slotEnd.toISOString(),
      price_in_cents: priceBreakdown.totalCents / slots,
    });
  }

  try {
    // Use RPC for atomic booking creation with availability check
    const { data: bookingId, error } = await supabase.rpc('create_booking_with_slots', {
      p_user_id: dbUser.id,
      p_organization_id: orgId,
      p_type: 'COURT_BOOKING',
      p_total_cents: priceBreakdown.totalCents,
      p_currency: priceBreakdown.currency,
      p_expires_at: addMinutes(new Date(), PAYMENT_TIMEOUT_MINUTES).toISOString(),
      p_slots: bookingSlots,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/courts");
    revalidatePath("/bookings");

    return { success: true, bookingId };
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
 */
export async function createMultipleBookings(
  orgId: string,
  slots: SlotInput[]
): Promise<BookingActionResult> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
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
  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_id', user.id)
    .single();

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

  // Check daily slot limit — group requested slots by date and check each
  const { data: org } = await supabase
    .from('organizations')
    .select('max_consecutive_slots')
    .eq('id', orgId)
    .single();

  const maxDailySlots = org?.max_consecutive_slots || 3;

  // All slots are typically on the same date, but group just in case
  const slotsByDate = new Map<string, number>();
  for (const slot of slots) {
    const dateKey = new Date(slot.startTime).toISOString().split('T')[0];
    slotsByDate.set(dateKey, (slotsByDate.get(dateKey) || 0) + 1);
  }

  for (const [dateKey, newSlotCount] of slotsByDate) {
    const dailyUsed = await getUserDailySlotsCount(dbUser.id, new Date(dateKey), orgId);
    if (dailyUsed + newSlotCount > maxDailySlots) {
      const remaining = Math.max(0, maxDailySlots - dailyUsed);
      return {
        error: remaining === 0
          ? `You've reached the daily booking limit of ${maxDailySlots} slot${maxDailySlots !== 1 ? "s" : ""} for this date.`
          : `You can only book ${remaining} more slot${remaining !== 1 ? "s" : ""} on this date (${dailyUsed}/${maxDailySlots} used).`,
      };
    }
  }

  try {
    const totalCents = slots.reduce((sum, slot) => sum + slot.priceInCents, 0);

    // Build slots JSON for the RPC function
    const bookingSlots = slots.map((slot) => ({
      court_id: slot.courtId,
      start_time: slot.startTime,
      end_time: slot.endTime,
      price_in_cents: slot.priceInCents,
    }));

    const { data: bookingId, error } = await supabase.rpc('create_booking_with_slots', {
      p_user_id: dbUser.id,
      p_organization_id: orgId,
      p_type: 'COURT_BOOKING',
      p_total_cents: totalCents,
      p_currency: 'SGD',
      p_expires_at: addMinutes(new Date(), PAYMENT_TIMEOUT_MINUTES).toISOString(),
      p_slots: bookingSlots,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/courts");
    revalidatePath("/bookings");

    return { success: true, bookingId };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to create booking. Please try again." };
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  bookingId: string,
  reason?: string
): Promise<BookingActionResult> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_id', user.id)
    .single();

  if (!dbUser) {
    return { error: "User not found" };
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, payments(*), users(*), booking_slots(*, courts(*)), organizations(slug)')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    return { error: "Booking not found" };
  }

  if (booking.user_id !== dbUser.id) {
    return { error: "You can only cancel your own bookings" };
  }

  if (!["PENDING_PAYMENT", "CONFIRMED"].includes(booking.status)) {
    return { error: "This booking cannot be cancelled" };
  }

  const wasConfirmed = booking.status === "CONFIRMED";

  await supabase
    .from('bookings')
    .update({
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
    })
    .eq('id', bookingId);

  // Send cancellation email
  const refundAmount = wasConfirmed
    ? `$${(booking.total_cents / 100).toFixed(2)} ${booking.currency}`
    : undefined;

  const bookingUser = booking.users;
  const sortedSlots = [...(booking.booking_slots || [])].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  const firstSlot = sortedSlots[0];
  if (firstSlot && bookingUser) {
    await sendBookingCancelledEmail({
      userEmail: bookingUser.email,
      userName: bookingUser.name || "Guest",
      courtName:
        sortedSlots.length > 1
          ? `${sortedSlots.length} slots`
          : firstSlot.courts.name,
      startTime: new Date(firstSlot.start_time),
      endTime: new Date(firstSlot.end_time),
      totalCents: booking.total_cents,
      currency: booking.currency,
      bookingId: booking.id,
      refundAmount,
    });
  }

  const orgSlug = booking.organizations?.slug;
  if (orgSlug) {
    revalidatePath(`/o/${orgSlug}/bookings`);
    revalidatePath(`/o/${orgSlug}/bookings/${bookingId}`);
  }
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);

  return { success: true };
}

export async function getBookingById(bookingId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_id', user.id)
    .single();

  if (!dbUser) {
    return null;
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, payments(*), users(*), booking_slots(*, courts(*))')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    return null;
  }

  // Check if user owns this booking or is admin
  if (booking.user_id !== dbUser.id && dbUser.role !== "ADMIN") {
    return null;
  }

  return booking;
}
