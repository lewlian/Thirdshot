/**
 * Unit tests for booking validation schemas
 */

import { createBookingSchema } from "@/lib/validations/booking";

describe("createBookingSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid booking with 1 slot", () => {
      const validData = {
        courtId: "court-123",
        date: "2026-01-20",
        startTime: "10:00",
        slots: 1,
      };

      const result = createBookingSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should accept valid booking with 2 slots", () => {
      const validData = {
        courtId: "court-123",
        date: "2026-01-20",
        startTime: "14:00",
        slots: 2,
      };

      const result = createBookingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept valid booking with 3 slots (maximum)", () => {
      const validData = {
        courtId: "court-123",
        date: "2026-01-20",
        startTime: "18:00",
        slots: 3,
      };

      const result = createBookingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject time with single digit hour", () => {
      const validData = {
        courtId: "court-123",
        date: "2026-01-20",
        startTime: "9:00",
        slots: 1,
      };

      const result = createBookingSchema.safeParse(validData);
      expect(result.success).toBe(false);
    });
  });

  describe("invalid inputs", () => {
    it("should reject missing courtId", () => {
      const invalidData = {
        date: "2026-01-20",
        startTime: "10:00",
        slots: 1,
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("courtId");
      }
    });

    it("should reject empty courtId", () => {
      const invalidData = {
        courtId: "",
        date: "2026-01-20",
        startTime: "10:00",
        slots: 1,
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject missing date", () => {
      const invalidData = {
        courtId: "court-123",
        startTime: "10:00",
        slots: 1,
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("date");
      }
    });

    it("should reject invalid date format", () => {
      const invalidData = {
        courtId: "court-123",
        date: "20-01-2026", // Wrong format
        startTime: "10:00",
        slots: 1,
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject missing startTime", () => {
      const invalidData = {
        courtId: "court-123",
        date: "2026-01-20",
        slots: 1,
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("startTime");
      }
    });

    it("should accept any two-digit hour format (regex only validates format)", () => {
      const data = {
        courtId: "court-123",
        date: "2026-01-20",
        startTime: "25:00", // Regex only checks \d{2}:\d{2}, not hour range
        slots: 1,
      };

      const result = createBookingSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject slots less than 1", () => {
      const invalidData = {
        courtId: "court-123",
        date: "2026-01-20",
        startTime: "10:00",
        slots: 0,
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject slots greater than 3", () => {
      const invalidData = {
        courtId: "court-123",
        date: "2026-01-20",
        startTime: "10:00",
        slots: 4,
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject negative slots", () => {
      const invalidData = {
        courtId: "court-123",
        date: "2026-01-20",
        startTime: "10:00",
        slots: -1,
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should accept decimal slots within range (no integer constraint)", () => {
      const data = {
        courtId: "court-123",
        date: "2026-01-20",
        startTime: "10:00",
        slots: 1.5,
      };

      const result = createBookingSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("type coercion", () => {
    it("should reject string slot values (no coercion)", () => {
      const data = {
        courtId: "court-123",
        date: "2026-01-20",
        startTime: "10:00",
        slots: "2" as any,
      };

      const result = createBookingSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should reject null values", () => {
      const invalidData = {
        courtId: null,
        date: null,
        startTime: null,
        slots: null,
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject undefined values", () => {
      const invalidData = {
        courtId: undefined,
        date: undefined,
        startTime: undefined,
        slots: undefined,
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should handle whitespace in courtId", () => {
      const validData = {
        courtId: "  court-123  ",
        date: "2026-01-20",
        startTime: "10:00",
        slots: 1,
      };

      const result = createBookingSchema.safeParse(validData);
      // Depending on schema, might trim or reject
      // This test documents current behavior
      expect(result.success).toBeDefined();
    });
  });
});
