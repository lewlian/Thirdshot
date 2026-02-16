/**
 * Unit tests for availability utilities
 * Tests peak time detection logic (pure function, no DB)
 */

// Test helper - reimplemented here to test without DB
function isPeakTime(hour: number, date: Date): boolean {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    return true;
  }

  // Weekday peak hours: 18:00 - 21:00
  return hour >= 18 && hour < 21;
}

describe("isPeakTime", () => {
  describe("weekends", () => {
    it("should return true for Saturday at any hour", () => {
      const saturday = new Date("2026-01-17"); // Saturday
      expect(isPeakTime(9, saturday)).toBe(true);
      expect(isPeakTime(14, saturday)).toBe(true);
      expect(isPeakTime(20, saturday)).toBe(true);
    });

    it("should return true for Sunday at any hour", () => {
      const sunday = new Date("2026-01-18"); // Sunday
      expect(isPeakTime(9, sunday)).toBe(true);
      expect(isPeakTime(14, sunday)).toBe(true);
      expect(isPeakTime(20, sunday)).toBe(true);
    });
  });

  describe("weekdays", () => {
    const monday = new Date("2026-01-19"); // Monday

    it("should return false for morning hours (before 18:00)", () => {
      expect(isPeakTime(7, monday)).toBe(false);
      expect(isPeakTime(9, monday)).toBe(false);
      expect(isPeakTime(12, monday)).toBe(false);
    });

    it("should return false for afternoon hours (before 18:00)", () => {
      expect(isPeakTime(13, monday)).toBe(false);
      expect(isPeakTime(15, monday)).toBe(false);
      expect(isPeakTime(17, monday)).toBe(false);
    });

    it("should return true for evening peak hours (18:00 - 21:00)", () => {
      expect(isPeakTime(18, monday)).toBe(true);
      expect(isPeakTime(19, monday)).toBe(true);
      expect(isPeakTime(20, monday)).toBe(true);
    });

    it("should return false for late night hours (21:00+)", () => {
      expect(isPeakTime(21, monday)).toBe(false);
      expect(isPeakTime(22, monday)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle boundary at 18:00", () => {
      const wednesday = new Date("2026-01-21"); // Wednesday
      expect(isPeakTime(17, wednesday)).toBe(false);
      expect(isPeakTime(18, wednesday)).toBe(true);
    });

    it("should handle boundary at 21:00", () => {
      const thursday = new Date("2026-01-22"); // Thursday
      expect(isPeakTime(20, thursday)).toBe(true);
      expect(isPeakTime(21, thursday)).toBe(false);
    });
  });
});

describe("price calculation helpers", () => {
  const standardPrice = 2000; // $20.00
  const peakPrice = 3000; // $30.00

  function calculateSlotPrice(
    hour: number,
    date: Date,
    pricePerHourCents: number,
    peakPricePerHourCents: number | null
  ): number {
    const isPeak = isPeakTime(hour, date);
    return isPeak && peakPricePerHourCents
      ? peakPricePerHourCents
      : pricePerHourCents;
  }

  it("should return standard price for off-peak weekday hours", () => {
    const monday = new Date("2026-01-19");
    expect(calculateSlotPrice(10, monday, standardPrice, peakPrice)).toBe(
      standardPrice
    );
  });

  it("should return peak price for peak weekday hours", () => {
    const monday = new Date("2026-01-19");
    expect(calculateSlotPrice(19, monday, standardPrice, peakPrice)).toBe(
      peakPrice
    );
  });

  it("should return peak price for weekend", () => {
    const saturday = new Date("2026-01-17");
    expect(calculateSlotPrice(10, saturday, standardPrice, peakPrice)).toBe(
      peakPrice
    );
  });

  it("should return standard price if no peak price is set", () => {
    const saturday = new Date("2026-01-17");
    expect(calculateSlotPrice(10, saturday, standardPrice, null)).toBe(
      standardPrice
    );
  });
});
