import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { addDays, startOfDay, endOfDay, setHours, setMinutes, isBefore, isAfter } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import type { TimeSlot } from "@/types/court";
import type { Court } from "@/types";
import { expireStaleBookings } from "./expire-stale-bookings";

const TIMEZONE = "Asia/Singapore";

/**
 * Get all time slots with availability status for a specific court on a specific date
 */
export async function getCourtAvailability(
  courtId: string,
  date: Date,
  orgId: string
): Promise<TimeSlot[]> {
  // Expire any stale pending bookings before checking availability
  await expireStaleBookings();

  const supabase = await createServerSupabaseClient();

  const { data: court } = await supabase
    .from('courts')
    .select('*')
    .eq('id', courtId)
    .single();

  if (!court || !court.is_active) {
    return [];
  }

  // Get all booking slots for this court on this date
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const { data: bookingSlots } = await supabase
    .from('booking_slots')
    .select('*, bookings!inner(status, organization_id)')
    .eq('court_id', courtId)
    .eq('bookings.organization_id', orgId)
    .gte('start_time', dayStart.toISOString())
    .lt('start_time', dayEnd.toISOString())
    .not('bookings.status', 'in', '("CANCELLED","EXPIRED")');

  // Get court blocks for this date
  const { data: blocks } = await supabase
    .from('court_blocks')
    .select('*')
    .eq('court_id', courtId)
    .eq('organization_id', orgId)
    .or(`and(start_time.gte.${dayStart.toISOString()},start_time.lt.${dayEnd.toISOString()}),and(end_time.gt.${dayStart.toISOString()},end_time.lte.${dayEnd.toISOString()}),and(start_time.lte.${dayStart.toISOString()},end_time.gte.${dayEnd.toISOString()})`);

  // Generate time slots
  const slots = generateTimeSlots(court, date);

  // Mark unavailable slots
  return slots.map((slot) => {
    const isBooked = (bookingSlots || []).some(
      (bookingSlot) =>
        isBefore(slot.startTime, new Date(bookingSlot.end_time)) &&
        isAfter(slot.endTime, new Date(bookingSlot.start_time))
    );

    const isBlocked = (blocks || []).some(
      (block) =>
        isBefore(slot.startTime, new Date(block.end_time)) &&
        isAfter(slot.endTime, new Date(block.start_time))
    );

    // Check if slot is in the past
    const now = new Date();
    const isPast = isBefore(slot.startTime, now);

    return {
      ...slot,
      isAvailable: !isBooked && !isBlocked && !isPast,
    };
  });
}

function generateTimeSlots(court: Court, date: Date): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Parse open and close times
  const [openHour, openMin] = court.open_time.split(":").map(Number);
  const [closeHour, closeMin] = court.close_time.split(":").map(Number);

  const slotDuration = court.slot_duration_minutes;

  // Create slots from open to close
  let currentHour = openHour;
  let currentMin = openMin;

  while (
    currentHour < closeHour ||
    (currentHour === closeHour && currentMin < closeMin)
  ) {
    // Create start time in SGT
    const sgtDate = toZonedTime(date, TIMEZONE);
    const startTimeSGT = setMinutes(setHours(sgtDate, currentHour), currentMin);
    const startTime = fromZonedTime(startTimeSGT, TIMEZONE);

    // Calculate end time
    const endMin = currentMin + slotDuration;
    const endHour = currentHour + Math.floor(endMin / 60);
    const endMinNormalized = endMin % 60;

    const endTimeSGT = setMinutes(setHours(sgtDate, endHour), endMinNormalized);
    const endTime = fromZonedTime(endTimeSGT, TIMEZONE);

    // Check if this is peak hours
    const isPeak = isPeakTime(currentHour, date);

    // Calculate price
    const priceInCents = isPeak && court.peak_price_per_hour_cents
      ? court.peak_price_per_hour_cents
      : court.price_per_hour_cents;

    slots.push({
      startTime,
      endTime,
      isAvailable: true, // Will be updated later
      isPeak,
      priceInCents,
    });

    // Move to next slot
    currentMin += slotDuration;
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
    }
  }

  return slots;
}

function isPeakTime(hour: number, date: Date): boolean {
  // Weekend is always peak (configurable via AppSettings)
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    return true;
  }

  // Weekday peak hours: 18:00 - 21:00 (configurable)
  return hour >= 18 && hour < 21;
}

/**
 * Get all dates within the booking window
 */
export async function getBookableDates(orgId: string): Promise<Date[]> {
  const supabase = await createServerSupabaseClient();

  // Get booking window from settings (default 7 days)
  const { data: setting } = await supabase
    .from('app_settings')
    .select('*')
    .eq('organization_id', orgId)
    .eq('key', 'booking_window_days')
    .single();

  const windowDays = setting ? parseInt(setting.value) : 7;
  const dates: Date[] = [];
  const today = startOfDay(new Date());

  for (let i = 0; i < windowDays; i++) {
    dates.push(addDays(today, i));
  }

  return dates;
}

/**
 * Check if a specific time slot is available for booking
 */
export async function checkSlotAvailability(
  courtId: string,
  startTime: Date,
  endTime: Date,
  orgId: string
): Promise<{ available: boolean; reason?: string }> {
  // Expire any stale pending bookings before checking
  await expireStaleBookings();

  const supabase = await createServerSupabaseClient();

  // Check if court exists and is active
  const { data: court } = await supabase
    .from('courts')
    .select('*')
    .eq('id', courtId)
    .single();

  if (!court || !court.is_active) {
    return { available: false, reason: "Court not available" };
  }

  // Check if slot is in the past
  if (isBefore(startTime, new Date())) {
    return { available: false, reason: "Cannot book slots in the past" };
  }

  // Check if within booking window
  const bookableDates = await getBookableDates(orgId);
  const slotDate = startOfDay(startTime);
  const isWithinWindow = bookableDates.some(
    (d) => d.getTime() === slotDate.getTime()
  );

  if (!isWithinWindow) {
    return { available: false, reason: "Slot is outside booking window" };
  }

  // Check for existing booking slots
  const { data: existingSlots } = await supabase
    .from('booking_slots')
    .select('*, bookings!inner(status, organization_id)')
    .eq('court_id', courtId)
    .eq('bookings.organization_id', orgId)
    .lt('start_time', endTime.toISOString())
    .gt('end_time', startTime.toISOString())
    .not('bookings.status', 'in', '("CANCELLED","EXPIRED")')
    .limit(1);

  if (existingSlots && existingSlots.length > 0) {
    return { available: false, reason: "Slot is already booked" };
  }

  // Check for court blocks
  const { data: blockData } = await supabase
    .from('court_blocks')
    .select('*')
    .eq('court_id', courtId)
    .eq('organization_id', orgId)
    .lt('start_time', endTime.toISOString())
    .gt('end_time', startTime.toISOString())
    .limit(1);

  if (blockData && blockData.length > 0) {
    return { available: false, reason: "Court is blocked during this time" };
  }

  return { available: true };
}

/**
 * Count how many booking slots a user has on a given date (across all courts).
 * Includes CONFIRMED and PENDING_PAYMENT bookings (not CANCELLED/EXPIRED).
 */
export async function getUserDailySlotsCount(
  userId: string,
  date: Date,
  orgId: string
): Promise<number> {
  const adminClient = createAdminSupabaseClient();

  // Compute day boundaries in SGT → UTC
  const dayInSGT = toZonedTime(date, TIMEZONE);
  const dayStartUTC = fromZonedTime(startOfDay(dayInSGT), TIMEZONE);
  const dayEndUTC = fromZonedTime(startOfDay(addDays(dayInSGT, 1)), TIMEZONE);

  const { count } = await adminClient
    .from('booking_slots')
    .select('*, bookings!inner(status, user_id, organization_id)', { count: 'exact', head: true })
    .eq('bookings.user_id', userId)
    .eq('bookings.organization_id', orgId)
    .gte('start_time', dayStartUTC.toISOString())
    .lt('start_time', dayEndUTC.toISOString())
    .not('bookings.status', 'in', '("CANCELLED","EXPIRED")');

  return count || 0;
}
