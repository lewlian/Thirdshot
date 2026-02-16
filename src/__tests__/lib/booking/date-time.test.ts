/**
 * Unit tests for date/time handling edge cases
 * Tests timezone conversions and date boundary scenarios
 */

import { startOfDay, endOfDay, addDays, parseISO } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const TIMEZONE = "Asia/Singapore";

describe("Date/Time Utilities", () => {
  describe("startOfDay", () => {
    it("should return midnight for any time during the day", () => {
      const date = new Date("2026-01-20T15:30:45");
      const result = startOfDay(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it("should preserve the date", () => {
      const date = new Date("2026-01-20T23:59:59");
      const result = startOfDay(date);

      expect(result.getDate()).toBe(20);
      expect(result.getMonth()).toBe(0); // January is 0
      expect(result.getFullYear()).toBe(2026);
    });

    it("should handle already midnight dates", () => {
      const date = new Date("2026-01-20T00:00:00");
      const result = startOfDay(date);

      expect(result.getTime()).toBe(date.getTime());
    });
  });

  describe("endOfDay", () => {
    it("should return last millisecond of the day", () => {
      const date = new Date("2026-01-20T10:00:00");
      const result = endOfDay(date);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });

    it("should be one millisecond before next day", () => {
      const date = new Date("2026-01-20T10:00:00");
      const result = endOfDay(date);
      const nextDay = startOfDay(addDays(date, 1));

      expect(result.getTime() + 1).toBe(nextDay.getTime());
    });
  });

  describe("timezone conversions", () => {
    it("should convert UTC to Singapore time correctly", () => {
      // Singapore is UTC+8
      const utcDate = new Date("2026-01-20T10:00:00Z"); // 10:00 UTC
      const sgtDate = toZonedTime(utcDate, TIMEZONE);

      expect(sgtDate.getHours()).toBe(18); // 10 + 8 = 18:00 SGT
    });

    it("should convert Singapore time to UTC correctly", () => {
      // Create a date representing 18:00 in Singapore
      const sgtDate = new Date(2026, 0, 20, 18, 0, 0); // 18:00 local
      const utcDate = fromZonedTime(sgtDate, TIMEZONE);

      expect(utcDate.getUTCHours()).toBe(10); // 18 - 8 = 10:00 UTC
    });

    it("should handle midnight conversions", () => {
      const utcMidnight = new Date("2026-01-20T00:00:00Z");
      const sgtDate = toZonedTime(utcMidnight, TIMEZONE);

      expect(sgtDate.getHours()).toBe(8); // 00:00 UTC = 08:00 SGT
      expect(sgtDate.getDate()).toBe(20); // Same day
    });

    it("should handle day boundary crossings", () => {
      // 20:00 SGT = 12:00 UTC
      const sgtEvening = new Date(2026, 0, 20, 20, 0, 0);
      const utcDate = fromZonedTime(sgtEvening, TIMEZONE);

      expect(utcDate.getUTCHours()).toBe(12);
      expect(utcDate.getUTCDate()).toBe(20);
    });

    it("should handle early morning boundary", () => {
      // 02:00 SGT = 18:00 previous day UTC
      const sgtMorning = new Date(2026, 0, 20, 2, 0, 0);
      const utcDate = fromZonedTime(sgtMorning, TIMEZONE);

      expect(utcDate.getUTCHours()).toBe(18);
      expect(utcDate.getUTCDate()).toBe(19); // Previous day
    });
  });

  describe("date parsing", () => {
    it("should parse ISO date string correctly", () => {
      const dateStr = "2026-01-20";
      const result = parseISO(dateStr);

      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(20);
    });

    it("should parse ISO datetime string correctly", () => {
      const dateStr = "2026-01-20T15:30:00";
      const result = parseISO(dateStr);

      expect(result.getHours()).toBe(15);
      expect(result.getMinutes()).toBe(30);
    });

    it("should parse ISO datetime with timezone", () => {
      const dateStr = "2026-01-20T15:30:00+08:00"; // Singapore time
      const result = parseISO(dateStr);

      // Result should be in UTC (7:30 UTC = 15:30 SGT)
      expect(result.getUTCHours()).toBe(7);
      expect(result.getUTCMinutes()).toBe(30);
    });

    it("should handle Z timezone indicator", () => {
      const dateStr = "2026-01-20T10:00:00Z";
      const result = parseISO(dateStr);

      expect(result.getUTCHours()).toBe(10);
    });
  });

  describe("date arithmetic", () => {
    it("should add days correctly", () => {
      const date = new Date("2026-01-20");
      const result = addDays(date, 7);

      expect(result.getDate()).toBe(27);
      expect(result.getMonth()).toBe(0); // Still January
    });

    it("should handle month boundaries", () => {
      const date = new Date("2026-01-28");
      const result = addDays(date, 5);

      expect(result.getDate()).toBe(2); // February 2
      expect(result.getMonth()).toBe(1); // February
    });

    it("should handle year boundaries", () => {
      const date = new Date("2026-12-30");
      const result = addDays(date, 5);

      expect(result.getDate()).toBe(4); // January 4
      expect(result.getMonth()).toBe(0); // January
      expect(result.getFullYear()).toBe(2027);
    });

    it("should handle leap years", () => {
      // 2024 is a leap year, 2026 is not
      const leapYear = new Date("2024-02-28");
      const result = addDays(leapYear, 1);

      expect(result.getDate()).toBe(29); // Feb 29 exists in leap year
      expect(result.getMonth()).toBe(1);
    });

    it("should handle negative day additions", () => {
      const date = new Date("2026-01-20");
      const result = addDays(date, -5);

      expect(result.getDate()).toBe(15);
      expect(result.getMonth()).toBe(0); // Still January
    });
  });

  describe("date comparisons", () => {
    it("should correctly compare dates", () => {
      const earlier = new Date("2026-01-20T10:00:00");
      const later = new Date("2026-01-20T11:00:00");

      expect(earlier.getTime() < later.getTime()).toBe(true);
      expect(later.getTime() > earlier.getTime()).toBe(true);
    });

    it("should handle same timestamp comparisons", () => {
      const date1 = new Date("2026-01-20T10:00:00Z");
      const date2 = new Date("2026-01-20T10:00:00Z");

      expect(date1.getTime() === date2.getTime()).toBe(true);
    });

    it("should compare dates ignoring timezone differences", () => {
      // Same moment in time, different timezone representations
      const utc = new Date("2026-01-20T10:00:00Z");
      const sgt = new Date("2026-01-20T18:00:00+08:00");

      expect(utc.getTime()).toBe(sgt.getTime());
    });
  });

  describe("slot time generation", () => {
    it("should generate consecutive hourly slots", () => {
      const start = new Date("2026-01-20T10:00:00");
      const slots = [start];

      for (let i = 1; i < 3; i++) {
        const nextSlot = new Date(start.getTime() + i * 60 * 60 * 1000);
        slots.push(nextSlot);
      }

      expect(slots).toHaveLength(3);
      expect(slots[0].getHours()).toBe(10);
      expect(slots[1].getHours()).toBe(11);
      expect(slots[2].getHours()).toBe(12);
    });

    it("should handle slots crossing midnight", () => {
      const start = new Date("2026-01-20T23:00:00");
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

      expect(end.getHours()).toBe(1); // 01:00
      expect(end.getDate()).toBe(21); // Next day
    });

    it("should handle 30-minute slots", () => {
      const start = new Date("2026-01-20T10:00:00");
      const slot30min = new Date(start.getTime() + 30 * 60 * 1000);

      expect(slot30min.getHours()).toBe(10);
      expect(slot30min.getMinutes()).toBe(30);
    });
  });

  describe("weekend detection", () => {
    it("should identify Saturday as weekend", () => {
      const saturday = new Date("2026-01-17"); // Saturday
      expect(saturday.getDay()).toBe(6);
    });

    it("should identify Sunday as weekend", () => {
      const sunday = new Date("2026-01-18"); // Sunday
      expect(sunday.getDay()).toBe(0);
    });

    it("should identify weekdays", () => {
      const monday = new Date("2026-01-19");
      const friday = new Date("2026-01-23");

      expect(monday.getDay()).toBe(1);
      expect(friday.getDay()).toBe(5);
    });
  });

  describe("edge cases", () => {
    it("should handle invalid dates", () => {
      const invalid = new Date("invalid");
      expect(isNaN(invalid.getTime())).toBe(true);
    });

    it("should handle far future dates", () => {
      const future = new Date("2100-12-31");
      expect(future.getFullYear()).toBe(2100);
    });

    it("should handle far past dates", () => {
      const past = new Date("1900-01-01");
      expect(past.getFullYear()).toBe(1900);
    });

    it("should handle millisecond precision", () => {
      const date1 = new Date("2026-01-20T10:00:00.000Z");
      const date2 = new Date("2026-01-20T10:00:00.001Z");

      expect(date2.getTime() - date1.getTime()).toBe(1);
    });
  });
});
