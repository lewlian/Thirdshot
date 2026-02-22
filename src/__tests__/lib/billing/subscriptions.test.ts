/**
 * Unit tests for subscription billing period calculations.
 */

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
}));

import { getNextPeriodEnd } from "@/lib/billing/subscriptions";

describe("getNextPeriodEnd", () => {
  it("monthly: adds 1 month", () => {
    const from = new Date("2025-03-15");
    const result = getNextPeriodEnd(from, "monthly");
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(3); // April (0-indexed)
    expect(result.getDate()).toBe(15);
  });

  it("quarterly: adds 3 months", () => {
    const from = new Date("2025-01-01");
    const result = getNextPeriodEnd(from, "quarterly");
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(1);
  });

  it("yearly: adds 1 year", () => {
    const from = new Date("2025-06-15");
    const result = getNextPeriodEnd(from, "yearly");
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5); // June
    expect(result.getDate()).toBe(15);
  });

  it("month-end handling: Jan 31 → Feb 28 in non-leap year", () => {
    const from = new Date("2025-01-31");
    const result = getNextPeriodEnd(from, "monthly");
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(1); // Feb
    expect(result.getDate()).toBe(28);
  });

  it("month-end handling: Jan 31 → Feb 29 in leap year", () => {
    const from = new Date("2024-01-31");
    const result = getNextPeriodEnd(from, "monthly");
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(1); // Feb
    expect(result.getDate()).toBe(29);
  });

  it("year crossing: Dec 15 monthly → Jan 15", () => {
    const from = new Date("2025-12-15");
    const result = getNextPeriodEnd(from, "monthly");
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // Jan
    expect(result.getDate()).toBe(15);
  });

  it("ordering: monthly < quarterly < yearly", () => {
    const from = new Date("2025-01-01");
    const m = getNextPeriodEnd(from, "monthly").getTime();
    const q = getNextPeriodEnd(from, "quarterly").getTime();
    const y = getNextPeriodEnd(from, "yearly").getTime();
    expect(m).toBeLessThan(q);
    expect(q).toBeLessThan(y);
  });
});
