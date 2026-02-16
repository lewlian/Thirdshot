import { prisma } from "@/lib/prisma";
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
 * Combines availability from all courts into time slots showing how many courts are available
 * @param date - Date to check availability for
 * @returns Array of aggregated time slots with per-court availability details and counts
 */
export async function getAggregatedAvailability(
  date: Date
): Promise<AggregatedTimeSlot[]> {
  // Get all active courts
  const courts = await prisma.court.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  if (courts.length === 0) {
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
 * This is used for the calendar view to show when booking opens for future dates
 * @param includeExtraDay - Whether to include one extra non-bookable day to show countdown
 * @returns Array of daily availability with booking open times for non-bookable dates
 */
export async function getCalendarAvailability(
  includeExtraDay: boolean = true
): Promise<DayAvailability[]> {
  const bookableDates = await getBookableDates();
  const dates = [...bookableDates];

  // Add one extra day that's not bookable yet
  // Note: getBookableDates() includes today (day 0), so the last date is day N-1
  // We want to show day N (which opens today at midnight - already passed)
  // So we need day N+1 to show a future countdown
  if (includeExtraDay) {
    const lastBookableDate = dates[dates.length - 1];
    const extraDay = addDays(lastBookableDate, 2); // Skip day N, go to N+1
    dates.push(extraDay);
  }

  // Get booking window setting
  const bookingWindowSetting = await prisma.appSetting.findUnique({
    where: { key: "booking_window_days" },
  });
  const bookingWindowDays = parseInt(bookingWindowSetting?.value || "7", 10);

  // Get availability for each date
  const availabilities = await Promise.all(
    dates.map(async (date, index) => {
      const isBookable = index < bookableDates.length;
      const slots = isBookable ? await getAggregatedAvailability(date) : [];

      let bookingOpensAt: Date | undefined;
      if (!isBookable) {
        // Calculate when booking opens for this date
        // Booking for date X opens (bookingWindowDays) days before at midnight SGT

        // First, convert the date to SGT to get the correct calendar date
        const dateSGT = toZonedTime(date, TIMEZONE);

        // Calculate which day booking opens (bookingWindowDays before)
        const bookingOpenDateSGT = addDays(dateSGT, -bookingWindowDays);

        // Create midnight on that day in SGT
        const year = bookingOpenDateSGT.getFullYear();
        const month = bookingOpenDateSGT.getMonth();
        const day = bookingOpenDateSGT.getDate();

        // Create a date representing midnight in the local timezone, then convert to SGT
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
  bookingOpenTime.setHours(0, 0, 0, 0); // Assuming booking opens at midnight

  // Calculate booking open date based on booking window
  // If booking window is 7 days, then booking for date X opens 7 days before
  // So for next day after window, it opens tomorrow
  const setting = await prisma.appSetting.findUnique({
    where: { key: "booking_window_days" },
  });

  const diff = bookingOpenTime.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
