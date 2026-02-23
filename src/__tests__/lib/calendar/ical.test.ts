/**
 * Unit tests for iCalendar generation and Google Calendar URL.
 */

import { generateICalEvent, generateGoogleCalendarUrl } from "@/lib/calendar/ical";

const SAMPLE_DATA = {
  title: "Pickleball - Court 1",
  description: "Booking ID: abc-123\nCourt: Court 1",
  location: "Thirdshot Club, 123 Main St, Singapore",
  startTime: new Date("2026-03-15T10:00:00Z"),
  endTime: new Date("2026-03-15T11:00:00Z"),
  bookingId: "abc-123",
};

describe("generateICalEvent", () => {
  it("returns a valid iCalendar string", () => {
    const ical = generateICalEvent(SAMPLE_DATA);

    expect(ical).toContain("BEGIN:VCALENDAR");
    expect(ical).toContain("END:VCALENDAR");
    expect(ical).toContain("BEGIN:VEVENT");
    expect(ical).toContain("END:VEVENT");
  });

  it("includes correct VCALENDAR properties", () => {
    const ical = generateICalEvent(SAMPLE_DATA);

    expect(ical).toContain("VERSION:2.0");
    expect(ical).toContain("PRODID:-//Thirdshot//Booking//EN");
    expect(ical).toContain("CALSCALE:GREGORIAN");
    expect(ical).toContain("METHOD:PUBLISH");
  });

  it("includes correct event summary", () => {
    const ical = generateICalEvent(SAMPLE_DATA);
    expect(ical).toContain("SUMMARY:Pickleball - Court 1");
  });

  it("includes correct start and end times in UTC format", () => {
    const ical = generateICalEvent(SAMPLE_DATA);
    expect(ical).toContain("DTSTART:20260315T100000Z");
    expect(ical).toContain("DTEND:20260315T110000Z");
  });

  it("includes location", () => {
    const ical = generateICalEvent(SAMPLE_DATA);
    expect(ical).toContain("LOCATION:Thirdshot Club\\, 123 Main St\\, Singapore");
  });

  it("includes booking ID as UID", () => {
    const ical = generateICalEvent(SAMPLE_DATA);
    expect(ical).toContain("UID:abc-123@thirdshot-booking.vercel.app");
  });

  it("includes description with escaped newlines", () => {
    const ical = generateICalEvent(SAMPLE_DATA);
    expect(ical).toContain("DESCRIPTION:Booking ID: abc-123\\nCourt: Court 1");
  });

  it("uses CRLF line endings", () => {
    const ical = generateICalEvent(SAMPLE_DATA);
    expect(ical).toContain("\r\n");
  });

  it("includes STATUS:CONFIRMED", () => {
    const ical = generateICalEvent(SAMPLE_DATA);
    expect(ical).toContain("STATUS:CONFIRMED");
  });

  it("escapes special characters in title", () => {
    const data = { ...SAMPLE_DATA, title: "Test; event, with: special" };
    const ical = generateICalEvent(data);
    expect(ical).toContain("SUMMARY:Test\\; event\\, with: special");
  });
});

describe("generateGoogleCalendarUrl", () => {
  it("returns a Google Calendar render URL", () => {
    const url = generateGoogleCalendarUrl(SAMPLE_DATA);
    expect(url).toContain("https://calendar.google.com/calendar/render");
  });

  it("includes action=TEMPLATE", () => {
    const url = generateGoogleCalendarUrl(SAMPLE_DATA);
    expect(url).toContain("action=TEMPLATE");
  });

  it("includes event title", () => {
    const url = generateGoogleCalendarUrl(SAMPLE_DATA);
    expect(url).toContain("text=Pickleball");
  });

  it("includes dates in correct format", () => {
    const url = generateGoogleCalendarUrl(SAMPLE_DATA);
    expect(url).toContain("dates=20260315T100000Z%2F20260315T110000Z");
  });

  it("includes location", () => {
    const url = generateGoogleCalendarUrl(SAMPLE_DATA);
    expect(url).toContain("location=");
    expect(url).toContain("Thirdshot");
  });

  it("includes details", () => {
    const url = generateGoogleCalendarUrl(SAMPLE_DATA);
    expect(url).toContain("details=");
    expect(url).toContain("abc-123");
  });
});
