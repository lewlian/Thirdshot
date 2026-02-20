/**
 * Tests for booking expiration cron endpoint
 * Tests the /api/cron/expire-bookings route
 */

import { NextRequest } from "next/server";

// Mock Supabase admin client
const mockRpc = jest.fn();
jest.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    rpc: mockRpc,
  }),
}));

// Import the route handler after mocking
import { GET } from "@/app/api/cron/expire-bookings/route";

describe("GET /api/cron/expire-bookings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("authorization", () => {
    it("should verify CRON_SECRET when set", async () => {
      const originalEnv = process.env.CRON_SECRET;
      process.env.CRON_SECRET = "test-secret";

      mockRpc.mockResolvedValue({
        data: { expired_count: 0, booking_ids: [] },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/cron/expire-bookings", {
        headers: { authorization: "Bearer test-secret" },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      process.env.CRON_SECRET = originalEnv;
    });

    it("should reject invalid CRON_SECRET", async () => {
      const originalEnv = process.env.CRON_SECRET;
      process.env.CRON_SECRET = "test-secret";

      const request = new NextRequest("http://localhost/api/cron/expire-bookings", {
        headers: { authorization: "Bearer wrong-secret" },
      });

      const response = await GET(request);
      expect(response.status).toBe(401);

      process.env.CRON_SECRET = originalEnv;
    });

    it("should allow access when no CRON_SECRET is set", async () => {
      const originalEnv = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;

      mockRpc.mockResolvedValue({
        data: { expired_count: 0, booking_ids: [] },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/cron/expire-bookings");
      const response = await GET(request);
      expect(response.status).toBe(200);

      process.env.CRON_SECRET = originalEnv;
    });
  });

  describe("expiration logic", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET;
    });

    it("should call expire_pending_bookings RPC", async () => {
      mockRpc.mockResolvedValue({
        data: { expired_count: 0, booking_ids: [] },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/cron/expire-bookings");
      await GET(request);

      expect(mockRpc).toHaveBeenCalledWith("expire_pending_bookings");
    });

    it("should return expired count and booking IDs", async () => {
      const expiredIds = ["booking-1", "booking-2", "booking-3"];
      mockRpc.mockResolvedValue({
        data: { expired_count: 3, booking_ids: expiredIds },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/cron/expire-bookings");
      const response = await GET(request);
      const body = await response.json();

      expect(body.expiredCount).toBe(3);
      expect(body.bookingIds).toEqual(expiredIds);
      expect(body.message).toContain("3");
    });

    it("should return zero count when no bookings expired", async () => {
      mockRpc.mockResolvedValue({
        data: { expired_count: 0, booking_ids: [] },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/cron/expire-bookings");
      const response = await GET(request);
      const body = await response.json();

      expect(body.expiredCount).toBe(0);
      expect(body.message).toBe("No expired bookings found");
    });

    it("should handle RPC errors gracefully", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const request = new NextRequest("http://localhost/api/cron/expire-bookings");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to expire bookings");
    });

    it("should handle multiple expired bookings", async () => {
      const expiredIds = Array.from({ length: 10 }, (_, i) => `booking-${i}`);
      mockRpc.mockResolvedValue({
        data: { expired_count: 10, booking_ids: expiredIds },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/cron/expire-bookings");
      const response = await GET(request);
      const body = await response.json();

      expect(body.expiredCount).toBe(10);
      expect(body.bookingIds).toHaveLength(10);
    });
  });
});
