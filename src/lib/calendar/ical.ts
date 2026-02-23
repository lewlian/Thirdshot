/**
 * iCalendar (.ics) file generation and Google Calendar URL helpers
 */

interface CalendarEventData {
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  bookingId: string;
}

function formatICalDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateICalEvent(data: CalendarEventData): string {
  const now = formatICalDate(new Date());
  const start = formatICalDate(data.startTime);
  const end = formatICalDate(data.endTime);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Thirdshot//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `DTSTAMP:${now}`,
    `UID:${data.bookingId}@thirdshot-booking.vercel.app`,
    `SUMMARY:${escapeICalText(data.title)}`,
    `DESCRIPTION:${escapeICalText(data.description)}`,
    `LOCATION:${escapeICalText(data.location)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function generateGoogleCalendarUrl(data: CalendarEventData): string {
  const start = formatICalDate(data.startTime);
  const end = formatICalDate(data.endTime);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: data.title,
    dates: `${start}/${end}`,
    details: data.description,
    location: data.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
