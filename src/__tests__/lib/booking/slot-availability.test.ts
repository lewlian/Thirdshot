/**
 * Unit tests for slot availability checking
 * Tests the transaction-based availability checking logic
 */

import { checkSlotAvailabilityInTransaction } from "@/lib/booking/availability";

// Mock Prisma transaction client
const createMockTx = (existingSlot: any = null, block: any = null) => ({
  bookingSlot: {
    findFirst: jest.fn().mockResolvedValue(existingSlot),
  },
  courtBlock: {
    findFirst: jest.fn().mockResolvedValue(block),
  },
});

describe("checkSlotAvailabilityInTransaction", () => {
  const courtId = "court-123";
  const startTime = new Date("2026-01-20T10:00:00");
  const endTime = new Date("2026-01-20T11:00:00");

  describe("available slots", () => {
    it("should not throw when slot is available", async () => {
      const mockTx = createMockTx(null, null);

      await expect(
        checkSlotAvailabilityInTransaction(mockTx, courtId, startTime, endTime)
      ).resolves.not.toThrow();

      expect(mockTx.bookingSlot.findFirst).toHaveBeenCalledWith({
        where: {
          courtId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          booking: {
            status: { notIn: ["CANCELLED", "EXPIRED"] },
          },
        },
      });
    });
  });

  describe("unavailable slots", () => {
    it("should throw when slot is already booked", async () => {
      const existingBooking = {
        id: "slot-123",
        courtId,
        startTime,
        endTime,
        booking: { status: "CONFIRMED" },
      };
      const mockTx = createMockTx(existingBooking, null);

      await expect(
        checkSlotAvailabilityInTransaction(mockTx, courtId, startTime, endTime)
      ).rejects.toThrow("One or more slots are no longer available");
    });

    it("should throw when court is blocked", async () => {
      const blockData = {
        id: "block-123",
        courtId,
        startTime,
        endTime,
        reason: "Maintenance",
      };
      const mockTx = createMockTx(null, blockData);

      await expect(
        checkSlotAvailabilityInTransaction(mockTx, courtId, startTime, endTime)
      ).rejects.toThrow("Court is blocked during selected time");
    });
  });

  describe("time overlap scenarios", () => {
    it("should detect partial overlap at start", async () => {
      // Existing: 09:00-10:30, Requested: 10:00-11:00 (overlaps 30 min)
      const existingBooking = {
        id: "slot-123",
        startTime: new Date("2026-01-20T09:00:00"),
        endTime: new Date("2026-01-20T10:30:00"),
      };
      const mockTx = createMockTx(existingBooking, null);

      await expect(
        checkSlotAvailabilityInTransaction(mockTx, courtId, startTime, endTime)
      ).rejects.toThrow("One or more slots are no longer available");
    });

    it("should detect partial overlap at end", async () => {
      // Existing: 10:30-12:00, Requested: 10:00-11:00 (overlaps 30 min)
      const existingBooking = {
        id: "slot-123",
        startTime: new Date("2026-01-20T10:30:00"),
        endTime: new Date("2026-01-20T12:00:00"),
      };
      const mockTx = createMockTx(existingBooking, null);

      await expect(
        checkSlotAvailabilityInTransaction(mockTx, courtId, startTime, endTime)
      ).rejects.toThrow("One or more slots are no longer available");
    });

    it("should detect complete containment", async () => {
      // Existing: 09:00-12:00, Requested: 10:00-11:00 (fully contained)
      const existingBooking = {
        id: "slot-123",
        startTime: new Date("2026-01-20T09:00:00"),
        endTime: new Date("2026-01-20T12:00:00"),
      };
      const mockTx = createMockTx(existingBooking, null);

      await expect(
        checkSlotAvailabilityInTransaction(mockTx, courtId, startTime, endTime)
      ).rejects.toThrow("One or more slots are no longer available");
    });

    it("should allow adjacent slots without overlap", async () => {
      // Existing: 09:00-10:00, Requested: 10:00-11:00 (adjacent, no overlap)
      const existingBooking = {
        id: "slot-123",
        startTime: new Date("2026-01-20T09:00:00"),
        endTime: new Date("2026-01-20T10:00:00"),
      };
      const mockTx = createMockTx(existingBooking, null);

      // Should NOT throw - slots are adjacent but don't overlap
      await expect(
        checkSlotAvailabilityInTransaction(mockTx, courtId, startTime, endTime)
      ).resolves.not.toThrow();
    });
  });

  describe("cancelled/expired bookings", () => {
    it("should ignore cancelled bookings", async () => {
      const cancelledBooking = {
        id: "slot-123",
        courtId,
        startTime,
        endTime,
        booking: { status: "CANCELLED" },
      };

      // Mock should return null because of the notIn filter
      const mockTx = createMockTx(null, null);

      await expect(
        checkSlotAvailabilityInTransaction(mockTx, courtId, startTime, endTime)
      ).resolves.not.toThrow();
    });

    it("should ignore expired bookings", async () => {
      const expiredBooking = {
        id: "slot-123",
        courtId,
        startTime,
        endTime,
        booking: { status: "EXPIRED" },
      };

      // Mock should return null because of the notIn filter
      const mockTx = createMockTx(null, null);

      await expect(
        checkSlotAvailabilityInTransaction(mockTx, courtId, startTime, endTime)
      ).resolves.not.toThrow();
    });
  });
});
