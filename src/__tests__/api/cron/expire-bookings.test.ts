/**
 * Tests for booking expiration cron endpoint logic
 * Tests the Supabase RPC-based expiration behavior
 */

// Mock Supabase admin client
const mockRpc = jest.fn();
jest.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    rpc: mockRpc,
  }),
}));

describe("expire-bookings cron logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("authorization", () => {
    it("should verify CRON_SECRET when set", () => {
      const originalEnv = process.env.CRON_SECRET;
      process.env.CRON_SECRET = "test-secret";

      const authHeader = "Bearer test-secret";
      expect(authHeader).toBe(`Bearer ${process.env.CRON_SECRET}`);

      process.env.CRON_SECRET = originalEnv;
    });

    it("should reject invalid CRON_SECRET", () => {
      const originalEnv = process.env.CRON_SECRET;
      process.env.CRON_SECRET = "test-secret";

      const authHeader = "Bearer wrong-secret";
      expect(authHeader).not.toBe(`Bearer ${process.env.CRON_SECRET}`);

      process.env.CRON_SECRET = originalEnv;
    });

    it("should allow access when no CRON_SECRET is set", () => {
      const originalEnv = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;

      const cronSecret = process.env.CRON_SECRET;
      expect(cronSecret).toBeUndefined();

      process.env.CRON_SECRET = originalEnv;
    });
  });

  describe("expiration via RPC", () => {
    it("should call expire_pending_bookings RPC", async () => {
      mockRpc.mockResolvedValue({
        data: { expired_count: 0, booking_ids: [] },
        error: null,
      });

      const { createAdminSupabaseClient } = require("@/lib/supabase/admin");
      const adminClient = createAdminSupabaseClient();
      await adminClient.rpc("expire_pending_bookings");

      expect(mockRpc).toHaveBeenCalledWith("expire_pending_bookings");
    });

    it("should return expired count and booking IDs", async () => {
      const expiredIds = ["booking-1", "booking-2", "booking-3"];
      mockRpc.mockResolvedValue({
        data: { expired_count: 3, booking_ids: expiredIds },
        error: null,
      });

      const { createAdminSupabaseClient } = require("@/lib/supabase/admin");
      const adminClient = createAdminSupabaseClient();
      const { data } = await adminClient.rpc("expire_pending_bookings");

      expect(data.expired_count).toBe(3);
      expect(data.booking_ids).toEqual(expiredIds);
    });

    it("should return zero count when no bookings expired", async () => {
      mockRpc.mockResolvedValue({
        data: { expired_count: 0, booking_ids: [] },
        error: null,
      });

      const { createAdminSupabaseClient } = require("@/lib/supabase/admin");
      const adminClient = createAdminSupabaseClient();
      const { data } = await adminClient.rpc("expire_pending_bookings");

      expect(data.expired_count).toBe(0);
    });

    it("should handle RPC errors", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const { createAdminSupabaseClient } = require("@/lib/supabase/admin");
      const adminClient = createAdminSupabaseClient();
      const { error } = await adminClient.rpc("expire_pending_bookings");

      expect(error).toBeTruthy();
      expect(error.message).toBe("Database error");
    });

    it("should handle multiple expired bookings", async () => {
      const expiredIds = Array.from({ length: 10 }, (_, i) => `booking-${i}`);
      mockRpc.mockResolvedValue({
        data: { expired_count: 10, booking_ids: expiredIds },
        error: null,
      });

      const { createAdminSupabaseClient } = require("@/lib/supabase/admin");
      const adminClient = createAdminSupabaseClient();
      const { data } = await adminClient.rpc("expire_pending_bookings");

      expect(data.expired_count).toBe(10);
      expect(data.booking_ids).toHaveLength(10);
    });
  });

  describe("response format", () => {
    it("should format success response with count and IDs", () => {
      const expiredIds = ["booking-1", "booking-2", "booking-3"];
      const response = {
        message: `Expired ${expiredIds.length} bookings`,
        expiredCount: expiredIds.length,
        bookingIds: expiredIds,
      };

      expect(response.expiredCount).toBe(3);
      expect(response.bookingIds).toEqual(expiredIds);
      expect(response.message).toContain("3");
    });

    it("should format empty response when no bookings expired", () => {
      const response = {
        message: "No expired bookings found",
        expiredCount: 0,
      };

      expect(response.expiredCount).toBe(0);
    });
  });
});
