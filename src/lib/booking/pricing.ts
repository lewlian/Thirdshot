import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Court } from "@/types";
import type { BookingPriceBreakdown } from "@/types/booking";
import { addHours } from "date-fns";

export async function calculateBookingPrice(
  court: Court,
  startTime: Date,
  slots: number
): Promise<BookingPriceBreakdown> {
  const slotDurationHours = court.slot_duration_minutes / 60;
  const breakdown: BookingPriceBreakdown = {
    slots: [],
    totalCents: 0,
    currency: "SGD",
  };

  let currentStart = startTime;

  for (let i = 0; i < slots; i++) {
    const currentEnd = addHours(currentStart, slotDurationHours);
    const isPeak = isPeakTime(currentStart);

    const priceInCents =
      isPeak && court.peak_price_per_hour_cents
        ? court.peak_price_per_hour_cents
        : court.price_per_hour_cents;

    breakdown.slots.push({
      startTime: currentStart,
      endTime: currentEnd,
      isPeak,
      priceInCents,
    });

    breakdown.totalCents += priceInCents;
    currentStart = currentEnd;
  }

  return breakdown;
}

function isPeakTime(date: Date): boolean {
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    return true;
  }

  // Weekday peak hours: 18:00 - 21:00
  return hour >= 18 && hour < 21;
}

export async function getAppSettings() {
  const supabase = await createServerSupabaseClient();

  const { data: settings } = await supabase
    .from('app_settings')
    .select('*');

  return (settings || []).reduce(
    (acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    },
    {} as Record<string, string>
  );
}
