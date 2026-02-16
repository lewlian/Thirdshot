/**
 * Unit tests for pricing calculation
 * Tests booking price calculations for different scenarios
 */

import type { Court } from "@prisma/client";

// Mock court data
const createMockCourt = (overrides: Partial<Court> = {}): Court => ({
  id: "court-1",
  name: "Test Court",
  description: "Test Description",
  isActive: true,
  isIndoor: true,
  pricePerHourCents: 2000, // $20/hr standard
  peakPricePerHourCents: 3000, // $30/hr peak
  surfaceType: "Premium",
  hasLighting: true,
  openTime: "08:00",
  closeTime: "22:00",
  slotDurationMinutes: 60,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Helper to calculate price (replicated from pricing.ts for testing)
function calculateBookingPrice(
  court: Court,
  startTime: Date,
  slots: number
): { slots: any[]; totalCents: number; currency: string } {
  const slotDurationHours = court.slotDurationMinutes / 60;
  const breakdown = {
    slots: [] as any[],
    totalCents: 0,
    currency: "SGD",
  };

  let currentStart = startTime;

  for (let i = 0; i < slots; i++) {
    const currentEnd = new Date(
      currentStart.getTime() + slotDurationHours * 60 * 60 * 1000
    );
    const isPeak = isPeakTime(currentStart);

    const priceInCents =
      isPeak && court.peakPricePerHourCents
        ? court.peakPricePerHourCents
        : court.pricePerHourCents;

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

  return hour >= 18 && hour < 21;
}

describe("calculateBookingPrice", () => {
  const court = createMockCourt();

  describe("single slot pricing", () => {
    it("should calculate standard price for weekday off-peak", () => {
      const monday10am = new Date("2026-01-19T10:00:00"); // Monday 10:00 AM
      const result = calculateBookingPrice(court, monday10am, 1);

      expect(result.totalCents).toBe(2000);
      expect(result.slots).toHaveLength(1);
      expect(result.slots[0].isPeak).toBe(false);
      expect(result.slots[0].priceInCents).toBe(2000);
    });

    it("should calculate peak price for weekday evening", () => {
      const monday7pm = new Date("2026-01-19T19:00:00"); // Monday 7:00 PM
      const result = calculateBookingPrice(court, monday7pm, 1);

      expect(result.totalCents).toBe(3000);
      expect(result.slots).toHaveLength(1);
      expect(result.slots[0].isPeak).toBe(true);
      expect(result.slots[0].priceInCents).toBe(3000);
    });

    it("should calculate peak price for weekend morning", () => {
      const saturday10am = new Date("2026-01-17T10:00:00"); // Saturday 10:00 AM
      const result = calculateBookingPrice(court, saturday10am, 1);

      expect(result.totalCents).toBe(3000);
      expect(result.slots).toHaveLength(1);
      expect(result.slots[0].isPeak).toBe(true);
      expect(result.slots[0].priceInCents).toBe(3000);
    });

    it("should calculate peak price for Sunday", () => {
      const sunday3pm = new Date("2026-01-18T15:00:00"); // Sunday 3:00 PM
      const result = calculateBookingPrice(court, sunday3pm, 1);

      expect(result.totalCents).toBe(3000);
      expect(result.slots[0].isPeak).toBe(true);
    });
  });

  describe("multiple slot pricing", () => {
    it("should calculate total for 2 off-peak slots", () => {
      const monday10am = new Date("2026-01-19T10:00:00");
      const result = calculateBookingPrice(court, monday10am, 2);

      expect(result.totalCents).toBe(4000); // 2 x $20
      expect(result.slots).toHaveLength(2);
      expect(result.slots.every((s) => !s.isPeak)).toBe(true);
    });

    it("should calculate total for 3 peak slots", () => {
      const saturday10am = new Date("2026-01-17T10:00:00");
      const result = calculateBookingPrice(court, saturday10am, 3);

      expect(result.totalCents).toBe(9000); // 3 x $30
      expect(result.slots).toHaveLength(3);
      expect(result.slots.every((s) => s.isPeak)).toBe(true);
    });

    it("should calculate mixed pricing when crossing peak boundary", () => {
      // Monday 5:00 PM - 8:00 PM (3 slots: 17-18, 18-19, 19-20)
      // First slot: off-peak ($20), next two: peak ($30 each)
      const monday5pm = new Date("2026-01-19T17:00:00");
      const result = calculateBookingPrice(court, monday5pm, 3);

      expect(result.totalCents).toBe(8000); // $20 + $30 + $30
      expect(result.slots).toHaveLength(3);
      expect(result.slots[0].isPeak).toBe(false);
      expect(result.slots[0].priceInCents).toBe(2000);
      expect(result.slots[1].isPeak).toBe(true);
      expect(result.slots[1].priceInCents).toBe(3000);
      expect(result.slots[2].isPeak).toBe(true);
      expect(result.slots[2].priceInCents).toBe(3000);
    });

    it("should calculate mixed pricing when exiting peak hours", () => {
      // Monday 8:00 PM - 11:00 PM (3 slots: 20-21, 21-22, 22-23)
      // First slot: peak ($30), next two: off-peak ($20 each)
      const monday8pm = new Date("2026-01-19T20:00:00");
      const result = calculateBookingPrice(court, monday8pm, 3);

      expect(result.totalCents).toBe(7000); // $30 + $20 + $20
      expect(result.slots).toHaveLength(3);
      expect(result.slots[0].isPeak).toBe(true);
      expect(result.slots[1].isPeak).toBe(false);
      expect(result.slots[2].isPeak).toBe(false);
    });
  });

  describe("courts without peak pricing", () => {
    it("should use standard price even during peak times", () => {
      const noPeakCourt = createMockCourt({
        peakPricePerHourCents: null,
      });
      const saturday10am = new Date("2026-01-17T10:00:00");
      const result = calculateBookingPrice(noPeakCourt, saturday10am, 2);

      expect(result.totalCents).toBe(4000); // 2 x $20 (standard)
      expect(result.slots.every((s) => s.priceInCents === 2000)).toBe(true);
    });
  });

  describe("slot duration variations", () => {
    it("should handle 30-minute slots", () => {
      const halfHourCourt = createMockCourt({
        slotDurationMinutes: 30,
      });
      const monday10am = new Date("2026-01-19T10:00:00");
      const result = calculateBookingPrice(halfHourCourt, monday10am, 2);

      // Each slot is 30 min, prices should still be hourly rates
      expect(result.slots).toHaveLength(2);
      expect(result.slots[0].endTime.getTime()).toBe(
        new Date("2026-01-19T10:30:00").getTime()
      );
      expect(result.slots[1].endTime.getTime()).toBe(
        new Date("2026-01-19T11:00:00").getTime()
      );
    });

    it("should handle 90-minute slots", () => {
      const ninetyMinCourt = createMockCourt({
        slotDurationMinutes: 90,
      });
      const monday10am = new Date("2026-01-19T10:00:00");
      const result = calculateBookingPrice(ninetyMinCourt, monday10am, 2);

      expect(result.slots).toHaveLength(2);
      expect(result.slots[0].endTime.getTime()).toBe(
        new Date("2026-01-19T11:30:00").getTime()
      );
      expect(result.slots[1].endTime.getTime()).toBe(
        new Date("2026-01-19T13:00:00").getTime()
      );
    });
  });

  describe("edge cases", () => {
    it("should handle 0 slots", () => {
      const monday10am = new Date("2026-01-19T10:00:00");
      const result = calculateBookingPrice(court, monday10am, 0);

      expect(result.totalCents).toBe(0);
      expect(result.slots).toHaveLength(0);
    });

    it("should have correct currency", () => {
      const monday10am = new Date("2026-01-19T10:00:00");
      const result = calculateBookingPrice(court, monday10am, 1);

      expect(result.currency).toBe("SGD");
    });

    it("should calculate correctly at peak boundary (18:00)", () => {
      const monday6pm = new Date("2026-01-19T18:00:00");
      const result = calculateBookingPrice(court, monday6pm, 1);

      expect(result.slots[0].isPeak).toBe(true);
      expect(result.slots[0].priceInCents).toBe(3000);
    });

    it("should calculate correctly just before peak (17:00)", () => {
      const monday5pm = new Date("2026-01-19T17:00:00");
      const result = calculateBookingPrice(court, monday5pm, 1);

      expect(result.slots[0].isPeak).toBe(false);
      expect(result.slots[0].priceInCents).toBe(2000);
    });

    it("should calculate correctly at peak end boundary (21:00)", () => {
      const monday9pm = new Date("2026-01-19T21:00:00");
      const result = calculateBookingPrice(court, monday9pm, 1);

      expect(result.slots[0].isPeak).toBe(false);
      expect(result.slots[0].priceInCents).toBe(2000);
    });

    it("should calculate correctly just before peak end (20:00)", () => {
      const monday8pm = new Date("2026-01-19T20:00:00");
      const result = calculateBookingPrice(court, monday8pm, 1);

      expect(result.slots[0].isPeak).toBe(true);
      expect(result.slots[0].priceInCents).toBe(3000);
    });
  });
});

describe("isPeakTime", () => {
  describe("boundary testing", () => {
    it("should correctly identify Friday as weekday", () => {
      const friday = new Date("2026-01-23T10:00:00"); // Friday
      expect(isPeakTime(friday)).toBe(false);
    });

    it("should correctly identify Saturday as weekend", () => {
      const saturday = new Date("2026-01-17T10:00:00"); // Saturday
      expect(isPeakTime(saturday)).toBe(true);
    });

    it("should correctly identify Sunday as weekend", () => {
      const sunday = new Date("2026-01-18T10:00:00"); // Sunday
      expect(isPeakTime(sunday)).toBe(true);
    });

    it("should correctly identify Monday as weekday", () => {
      const monday = new Date("2026-01-19T10:00:00"); // Monday
      expect(isPeakTime(monday)).toBe(false);
    });
  });

  describe("hourly boundary testing", () => {
    const wednesday = new Date("2026-01-21"); // Wednesday

    const testCases = [
      { hour: 0, expected: false, description: "midnight" },
      { hour: 6, expected: false, description: "early morning" },
      { hour: 12, expected: false, description: "noon" },
      { hour: 17, expected: false, description: "5 PM (just before peak)" },
      { hour: 18, expected: true, description: "6 PM (peak start)" },
      { hour: 19, expected: true, description: "7 PM (mid-peak)" },
      { hour: 20, expected: true, description: "8 PM (last peak hour)" },
      { hour: 21, expected: false, description: "9 PM (peak end)" },
      { hour: 22, expected: false, description: "10 PM (after peak)" },
      { hour: 23, expected: false, description: "11 PM (late night)" },
    ];

    testCases.forEach(({ hour, expected, description }) => {
      it(`should return ${expected} for ${description}`, () => {
        const date = new Date(wednesday);
        date.setHours(hour);
        expect(isPeakTime(date)).toBe(expected);
      });
    });
  });
});
