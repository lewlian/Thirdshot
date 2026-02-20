import { createServerSupabaseClient } from "@/lib/supabase/server";
import { addDays, startOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { getCourtAvailability, getBookableDates } from "./availability";

const TIMEZONE = "Asia/Singapore";

export interface CourtAvailabilityForSlot {
  courtId: string;
  courtName: string;
  isAvailable: boolean;
  priceInCents: number;
}

export interface AggregatedTimeSlot {
  startTime: Date;
  endTime: Date;
  availableCount: number; // Number of courts available at this time
  totalCourts: number;
  isPeak: boolean;
  priceInCents: number;
  courts: CourtAvailabilityForSlot[]; // Per-court availability details
}

export interface DayAvailability {
  date: Date;
  isBookable: boolean;
  slots: AggregatedTimeSlot[];
  bookingOpensAt?: Date; // When booking opens for this date (for non-bookable days)
}

/**
 * Get aggregated availability for all active courts for a specific date
 */
export async function getAggregatedAvailability(
  date: Date
): Promise<AggregatedTimeSlot[]> {
  const supabase = await createServerSupabaseClient();

  // Get all active courts
  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!courts || courts.length === 0) {
    return [];
  }

  // Get availability for each court
  const courtAvailabilities = await Promise.all(
    courts.map((court) => getCourtAvailability(court.id, date))
  );

  // Aggregate by time slot
  const slotMap = new Map<string, AggregatedTimeSlot>();

  courtAvailabilities.forEach((courtSlots, courtIndex) => {
    const court = courts[courtIndex];
    courtSlots.forEach((slot) => {
      const key = `${slot.startTime.getTime()}-${slot.endTime.getTime()}`;

      if (!slotMap.has(key)) {
        slotMap.set(key, {
          startTime: slot.startTime,
          endTime: slot.endTime,
          availableCount: 0,
          totalCourts: courts.length,
          isPeak: slot.isPeak,
          priceInCents: slot.priceInCents,
          courts: [],
        });
      }

      const aggregated = slotMap.get(key)!;

      // Add court-specific availability
      aggregated.courts.push({
        courtId: court.id,
        courtName: court.name,
        isAvailable: slot.isAvailable,
        priceInCents: slot.priceInCents,
      });

      if (slot.isAvailable) {
        aggregated.availableCount++;
      }
    });
  });

  // Convert to array and sort by start time
  return Array.from(slotMap.values()).sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );
}

/**
 * Get availability for the next N days including 1 extra day that's not bookable yet
 */
export async function getCalendarAvailability(
  includeExtraDay: boolean = true
): Promise<DayAvailability[]> {
  const supabase = await createServerSupabaseClient();
  const bookableDates = await getBookableDates();
  const dates = [...bookableDates];

  // Add one extra day that's not bookable yet
  if (includeExtraDay) {
    const lastBookableDate = dates[dates.length - 1];
    const extraDay = addDays(lastBookableDate, 2); // Skip day N, go to N+1
    dates.push(extraDay);
  }

  // Get booking window setting
  const { data: bookingWindowSetting } = await supabase
    .from('app_settings')
    .select('*')
    .eq('key', 'booking_window_days')
    .single();

  const bookingWindowDays = parseInt(bookingWindowSetting?.value || "7", 10);

  // Get availability for each date
  const availabilities = await Promise.all(
    dates.map(async (date, index) => {
      const isBookable = index < bookableDates.length;
      const slots = isBookable ? await getAggregatedAvailability(date) : [];

      let bookingOpensAt: Date | undefined;
      if (!isBookable) {
        // Calculate when booking opens for this date
        const dateSGT = toZonedTime(date, TIMEZONE);
        const bookingOpenDateSGT = addDays(dateSGT, -bookingWindowDays);

        const year = bookingOpenDateSGT.getFullYear();
        const month = bookingOpenDateSGT.getMonth();
        const day = bookingOpenDateSGT.getDate();

        const midnightLocal = new Date(year, month, day, 0, 0, 0, 0);
        bookingOpensAt = fromZonedTime(midnightLocal, TIMEZONE);
      }

      return {
        date,
        isBookable,
        slots,
        bookingOpensAt,
      };
    })
  );

  return availabilities;
}

/**
 * Get time until booking opens for a specific date
 */
export async function getTimeUntilBookingOpens(date: Date): Promise<{
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}> {
  const now = new Date();
  const bookingOpenTime = new Date(date);
  bookingOpenTime.setHours(0, 0, 0, 0);

  const diff = bookingOpenTime.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
