import "dotenv/config";
import { addDays, startOfDay } from "date-fns";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";

const TIMEZONE = "Asia/Singapore";

console.log("\n=== Testing Fixed Countdown Calculation ===\n");

// Simulate getBookableDates() - it returns 7 dates starting from today at 00:00
const today = startOfDay(new Date());
const bookableDates: Date[] = [];
for (let i = 0; i < 7; i++) {
  bookableDates.push(addDays(today, i));
}

console.log("Today:", formatInTimeZone(today, TIMEZONE, "yyyy-MM-dd HH:mm:ss zzz"));
console.log("\nBookable dates:");
bookableDates.forEach((d, i) => {
  console.log(`  Day ${i}: ${formatInTimeZone(d, TIMEZONE, "yyyy-MM-dd")}`);
});

// Get the extra day (day 7)
const lastBookableDate = bookableDates[bookableDates.length - 1];
const extraDay = addDays(lastBookableDate, 1);
console.log(`\nExtra day (Day ${bookableDates.length}): ${formatInTimeZone(extraDay, TIMEZONE, "yyyy-MM-dd")}`);

// Calculate booking opens at - NEW LOGIC
const dateSGT = toZonedTime(extraDay, TIMEZONE);
console.log("\nExtra day in SGT:", formatInTimeZone(dateSGT, TIMEZONE, "yyyy-MM-dd HH:mm:ss zzz"));

const bookingOpenDateSGT = addDays(dateSGT, -7);
console.log("7 days before (SGT):", formatInTimeZone(bookingOpenDateSGT, TIMEZONE, "yyyy-MM-dd HH:mm:ss zzz"));

const year = bookingOpenDateSGT.getFullYear();
const month = bookingOpenDateSGT.getMonth();
const day = bookingOpenDateSGT.getDate();
const midnightLocal = new Date(year, month, day, 0, 0, 0, 0);
const bookingOpensAt = fromZonedTime(midnightLocal, TIMEZONE);

console.log("\nMidnight local:", midnightLocal.toISOString());
console.log("Booking opens at (UTC):", bookingOpensAt.toISOString());
console.log("Booking opens at (SGT):", formatInTimeZone(bookingOpensAt, TIMEZONE, "yyyy-MM-dd HH:mm:ss zzz"));

// Calculate countdown
const nowSGT = toZonedTime(new Date(), TIMEZONE);
const targetSGT = toZonedTime(bookingOpensAt, TIMEZONE);
const diff = targetSGT.getTime() - nowSGT.getTime();
const totalSeconds = Math.floor(diff / 1000);

const countdown = {
  days: Math.floor(totalSeconds / 86400),
  hours: Math.floor((totalSeconds % 86400) / 3600),
  minutes: Math.floor((totalSeconds % 3600) / 60),
  seconds: totalSeconds % 60,
};

console.log("\nCountdown:");
console.log(`  ${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes, ${countdown.seconds} seconds`);
console.log(`  Total: ${totalSeconds} seconds\n`);
