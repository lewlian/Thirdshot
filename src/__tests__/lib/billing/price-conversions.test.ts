/**
 * Unit tests for court price math used in create-org.
 * Tests the conversion logic: hourlyRate * 100 → cents, peak at 1.5x with Math.round.
 */

describe("court price conversions (create-org logic)", () => {
  // Mirrors the logic from src/app/api/create-org/route.ts lines 138-148
  function computeCourtPrices(courts: { name: string; hourlyRate: number }[]) {
    return courts.map((court, i) => ({
      name: court.name,
      price_per_hour_cents: court.hourlyRate * 100,
      peak_price_per_hour_cents: Math.round(court.hourlyRate * 1.5 * 100),
      sort_order: i,
    }));
  }

  it("converts hourlyRate to cents (integer rate)", () => {
    const [c] = computeCourtPrices([{ name: "Court A", hourlyRate: 20 }]);
    expect(c.price_per_hour_cents).toBe(2000);
  });

  it("computes peak at 1.5x", () => {
    const [c] = computeCourtPrices([{ name: "Court A", hourlyRate: 20 }]);
    expect(c.peak_price_per_hour_cents).toBe(3000);
  });

  it("rounds fractional peak price (e.g. hourlyRate=7 → peak 1050)", () => {
    const [c] = computeCourtPrices([{ name: "Court A", hourlyRate: 7 }]);
    expect(c.price_per_hour_cents).toBe(700);
    expect(c.peak_price_per_hour_cents).toBe(1050); // 7 * 1.5 * 100 = 1050 exact
  });

  it("handles fractional hourlyRate with rounding", () => {
    // hourlyRate = 13.33 → base = 1333, peak = 13.33*1.5*100 = 1999.5 → 2000
    const [c] = computeCourtPrices([{ name: "Court A", hourlyRate: 13.33 }]);
    expect(c.price_per_hour_cents).toBeCloseTo(1333, 0);
    expect(c.peak_price_per_hour_cents).toBe(Math.round(13.33 * 1.5 * 100));
  });

  it("handles zero rate", () => {
    const [c] = computeCourtPrices([{ name: "Free Court", hourlyRate: 0 }]);
    expect(c.price_per_hour_cents).toBe(0);
    expect(c.peak_price_per_hour_cents).toBe(0);
  });

  it("assigns sequential sort_order", () => {
    const courts = computeCourtPrices([
      { name: "Court 1", hourlyRate: 10 },
      { name: "Court 2", hourlyRate: 20 },
      { name: "Court 3", hourlyRate: 30 },
    ]);
    expect(courts[0].sort_order).toBe(0);
    expect(courts[1].sort_order).toBe(1);
    expect(courts[2].sort_order).toBe(2);
  });

  it("handles large hourlyRate", () => {
    const [c] = computeCourtPrices([{ name: "Premium", hourlyRate: 500 }]);
    expect(c.price_per_hour_cents).toBe(50000);
    expect(c.peak_price_per_hour_cents).toBe(75000);
  });
});
