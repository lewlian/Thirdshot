import { prisma } from "@/lib/prisma";
import { addDays, startOfDay, endOfDay, setHours, setMinutes, isBefore, isAfter } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import type { TimeSlot } from "@/types/court";
import type { Court } from "@prisma/client";

const TIMEZONE = "Asia/Singapore";

/**
 * Get all time slots with availability status for a specific court on a specific date
 * @param courtId - ID of the court to check
 * @param date - Date to check availability for
 * @returns Array of time slots with availability information (isAvailable, isPeak, priceInCents)
 */
export async function getCourtAvailability(
  courtId: string,
  date: Date
): Promise<TimeSlot[]> {
  const court = await prisma.court.findUnique({
    where: { id: courtId },
  });

  if (!court || !court.isActive) {
    return [];
  }

  // Get all booking slots for this court on this date
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const bookingSlots = await prisma.bookingSlot.findMany({
    where: {
      courtId,
      startTime: { gte: dayStart, lt: dayEnd },
      booking: {
        status: { notIn: ["CANCELLED", "EXPIRED"] },
      },
    },
  });

  // Get court blocks for this date
  const blocks = await prisma.courtBlock.findMany({
    where: {
      courtId,
      OR: [
        { startTime: { gte: dayStart, lt: dayEnd } },
        { endTime: { gt: dayStart, lte: dayEnd } },
        { startTime: { lte: dayStart }, endTime: { gte: dayEnd } },
      ],
    },
  });

  // Generate time slots
  const slots = generateTimeSlots(court, date);

  // Mark unavailable slots
  return slots.map((slot) => {
    const isBooked = bookingSlots.some(
      (bookingSlot) =>
        isBefore(slot.startTime, bookingSlot.endTime) &&
        isAfter(slot.endTime, bookingSlot.startTime)
    );

    const isBlocked = blocks.some(
      (block) =>
        isBefore(slot.startTime, block.endTime) &&
        isAfter(slot.endTime, block.startTime)
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
  const [openHour, openMin] = court.openTime.split(":").map(Number);
  const [closeHour, closeMin] = court.closeTime.split(":").map(Number);

  const slotDuration = court.slotDurationMinutes;

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
    const priceInCents = isPeak && court.peakPricePerHourCents
      ? court.peakPricePerHourCents
      : court.pricePerHourCents;

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
 * @returns Array of Date objects representing bookable dates (today + N days based on booking_window_days setting)
 */
export async function getBookableDates(): Promise<Date[]> {
  // Get booking window from settings (default 7 days)
  const setting = await prisma.appSetting.findUnique({
    where: { key: "booking_window_days" },
  });

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
 * Validates court existence, past times, booking window, existing bookings, and court blocks
 * @param courtId - ID of the court to check
 * @param startTime - Start time of the slot
 * @param endTime - End time of the slot
 * @returns Object with availability status and optional reason if unavailable
 */
export async function checkSlotAvailability(
  courtId: string,
  startTime: Date,
  endTime: Date
): Promise<{ available: boolean; reason?: string }> {
  // Check if court exists and is active
  const court = await prisma.court.findUnique({
    where: { id: courtId },
  });

  if (!court || !court.isActive) {
    return { available: false, reason: "Court not available" };
  }

  // Check if slot is in the past
  if (isBefore(startTime, new Date())) {
    return { available: false, reason: "Cannot book slots in the past" };
  }

  // Check if within booking window
  const bookableDates = await getBookableDates();
  const slotDate = startOfDay(startTime);
  const isWithinWindow = bookableDates.some(
    (d) => d.getTime() === slotDate.getTime()
  );

  if (!isWithinWindow) {
    return { available: false, reason: "Slot is outside booking window" };
  }

  // Check for existing booking slots
  const existingSlot = await prisma.bookingSlot.findFirst({
    where: {
      courtId,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      booking: {
        status: { notIn: ["CANCELLED", "EXPIRED"] },
      },
    },
  });

  if (existingSlot) {
    return { available: false, reason: "Slot is already booked" };
  }

  // Check for court blocks
  const block = await prisma.courtBlock.findFirst({
    where: {
      courtId,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });

  if (block) {
    return { available: false, reason: "Court is blocked during this time" };
  }

  return { available: true };
}

/**
 * Check slot availability within a Prisma transaction
 * This is used during booking creation to prevent race conditions
 */
export async function checkSlotAvailabilityInTransaction(
  tx: any, // Prisma transaction client
  courtId: string,
  startTime: Date,
  endTime: Date
): Promise<void> {
  // Check for existing booking slots
  const existingSlot = await tx.bookingSlot.findFirst({
    where: {
      courtId,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      booking: {
        status: { notIn: ["CANCELLED", "EXPIRED"] },
      },
    },
  });

  if (existingSlot) {
    throw new Error("One or more slots are no longer available");
  }

  // Check for court blocks
  const block = await tx.courtBlock.findFirst({
    where: {
      courtId,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });

  if (block) {
    throw new Error("Court is blocked during selected time");
  }
}
