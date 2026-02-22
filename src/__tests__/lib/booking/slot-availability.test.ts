/**
 * Unit tests for slot availability checking
 * Tests the Supabase-based availability checking logic
 */

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
}));

import { checkSlotAvailability } from "@/lib/booking/availability";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Helper to create a chainable Supabase query mock
function createChain(resolvedValue: any) {
  const chain: any = {};
  chain.then = (resolve: any, reject?: any) =>
    Promise.resolve(resolvedValue).then(resolve, reject);
  [
    "select",
    "eq",
    "lt",
    "gt",
    "gte",
    "lte",
    "not",
    "limit",
    "or",
    "order",
    "single",
    "range",
  ].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  return chain;
}

function createSupabaseMock(responses: Record<string, any>) {
  return {
    from: jest.fn((table: string) =>
      createChain(responses[table] || { data: null })
    ),
  };
}

describe("checkSlotAvailability", () => {
  const courtId = "court-123";

  // Use dates in the future (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startTime = new Date(tomorrow);
  startTime.setHours(10, 0, 0, 0);

  const endTime = new Date(tomorrow);
  endTime.setHours(11, 0, 0, 0);

  const activeCourt = {
    id: courtId,
    name: "Court A",
    is_active: true,
    open_time: "08:00",
    close_time: "22:00",
    slot_duration_minutes: 60,
    price_per_hour_cents: 2000,
    peak_price_per_hour_cents: 3000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("available slots", () => {
    it("should return available when slot has no conflicts", async () => {
      const mock = createSupabaseMock({
        courts: { data: activeCourt },
        app_settings: { data: { key: "booking_window_days", value: "14" } },
        booking_slots: { data: [] },
        court_blocks: { data: [] },
      });
      (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

      const result = await checkSlotAvailability(courtId, startTime, endTime, "test-org");
      expect(result.available).toBe(true);
    });
  });

  describe("unavailable slots", () => {
    it("should return unavailable when slot is already booked", async () => {
      const mock = createSupabaseMock({
        courts: { data: activeCourt },
        app_settings: { data: { key: "booking_window_days", value: "14" } },
        booking_slots: { data: [{ id: "existing-slot" }] },
        court_blocks: { data: [] },
      });
      (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

      const result = await checkSlotAvailability(courtId, startTime, endTime, "test-org");
      expect(result.available).toBe(false);
      expect(result.reason).toBe("Slot is already booked");
    });

    it("should return unavailable when court is blocked", async () => {
      const mock = createSupabaseMock({
        courts: { data: activeCourt },
        app_settings: { data: { key: "booking_window_days", value: "14" } },
        booking_slots: { data: [] },
        court_blocks: { data: [{ id: "block-1", reason: "Maintenance" }] },
      });
      (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

      const result = await checkSlotAvailability(courtId, startTime, endTime, "test-org");
      expect(result.available).toBe(false);
      expect(result.reason).toBe("Court is blocked during this time");
    });

    it("should return unavailable when court is inactive", async () => {
      const mock = createSupabaseMock({
        courts: { data: { ...activeCourt, is_active: false } },
      });
      (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

      const result = await checkSlotAvailability(courtId, startTime, endTime, "test-org");
      expect(result.available).toBe(false);
      expect(result.reason).toBe("Court not available");
    });

    it("should return unavailable when court does not exist", async () => {
      const mock = createSupabaseMock({
        courts: { data: null },
      });
      (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

      const result = await checkSlotAvailability(courtId, startTime, endTime, "test-org");
      expect(result.available).toBe(false);
      expect(result.reason).toBe("Court not available");
    });

    it("should return unavailable when slot is in the past", async () => {
      const pastStart = new Date();
      pastStart.setDate(pastStart.getDate() - 1);
      pastStart.setHours(10, 0, 0, 0);
      const pastEnd = new Date(pastStart);
      pastEnd.setHours(11, 0, 0, 0);

      const mock = createSupabaseMock({
        courts: { data: activeCourt },
      });
      (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

      const result = await checkSlotAvailability(courtId, pastStart, pastEnd, "test-org");
      expect(result.available).toBe(false);
      expect(result.reason).toBe("Cannot book slots in the past");
    });

    it("should return unavailable when outside booking window", async () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 30);
      farFuture.setHours(10, 0, 0, 0);
      const farFutureEnd = new Date(farFuture);
      farFutureEnd.setHours(11, 0, 0, 0);

      const mock = createSupabaseMock({
        courts: { data: activeCourt },
        app_settings: { data: { key: "booking_window_days", value: "7" } },
        booking_slots: { data: [] },
        court_blocks: { data: [] },
      });
      (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

      const result = await checkSlotAvailability(
        courtId,
        farFuture,
        farFutureEnd,
        "test-org"
      );
      expect(result.available).toBe(false);
      expect(result.reason).toBe("Slot is outside booking window");
    });
  });

  describe("query construction", () => {
    it("should query booking_slots to check for conflicts", async () => {
      const mock = createSupabaseMock({
        courts: { data: activeCourt },
        app_settings: { data: { key: "booking_window_days", value: "14" } },
        booking_slots: { data: [] },
        court_blocks: { data: [] },
      });
      (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

      await checkSlotAvailability(courtId, startTime, endTime, "test-org");
      expect(mock.from).toHaveBeenCalledWith("booking_slots");
    });

    it("should query court_blocks to check for blocks", async () => {
      const mock = createSupabaseMock({
        courts: { data: activeCourt },
        app_settings: { data: { key: "booking_window_days", value: "14" } },
        booking_slots: { data: [] },
        court_blocks: { data: [] },
      });
      (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

      await checkSlotAvailability(courtId, startTime, endTime, "test-org");
      expect(mock.from).toHaveBeenCalledWith("court_blocks");
    });
  });
});
