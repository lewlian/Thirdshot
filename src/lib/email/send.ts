import { getResendClient, getFromEmail } from "./client";
import { BookingConfirmationEmail } from "./templates/booking-confirmation";
import { BookingCancelledEmail } from "./templates/booking-cancelled";
import { BookingReminderEmail } from "./templates/booking-reminder";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "Asia/Singapore";

interface BookingEmailData {
  userEmail: string;
  userName: string;
  courtName: string;
  startTime: Date;
  endTime: Date;
  totalCents: number;
  currency: string;
  bookingId: string;
  paymentReference?: string;
}

export async function sendBookingConfirmationEmail(
  data: BookingEmailData
): Promise<boolean> {
  const resend = getResendClient();

  if (!resend) {
    return false;
  }

  const startTimeSGT = toZonedTime(data.startTime, TIMEZONE);
  const endTimeSGT = toZonedTime(data.endTime, TIMEZONE);

  const dateStr = format(startTimeSGT, "EEEE, d MMMM yyyy");
  const timeStr = `${format(startTimeSGT, "h:mm a")} - ${format(endTimeSGT, "h:mm a")}`;

  // Calculate duration
  const durationMs = data.endTime.getTime() - data.startTime.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  const durationStr = durationHours === 1 ? "1 hour" : `${durationHours} hours`;

  const totalDollars = (data.totalCents / 100).toFixed(2);

  try {
    const result = await resend.emails.send({
      from: getFromEmail(),
      to: data.userEmail,
      subject: `Booking Confirmed - ${data.courtName} on ${format(startTimeSGT, "d MMM")}`,
      html: BookingConfirmationEmail({
        userName: data.userName,
        courtName: data.courtName,
        date: dateStr,
        time: timeStr,
        duration: durationStr,
        totalAmount: `$${totalDollars} ${data.currency}`,
        bookingId: data.bookingId,
        paymentReference: data.paymentReference,
      }),
    });

    if (result.error) {
      console.error("Failed to send confirmation email:", {
        error: result.error,
        message: result.error.message,
        name: result.error.name,
        from: getFromEmail(),
        to: data.userEmail,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    return false;
  }
}

export async function sendBookingCancelledEmail(
  data: Omit<BookingEmailData, "paymentReference"> & { refundAmount?: string }
): Promise<boolean> {
  const resend = getResendClient();

  if (!resend) {
    return false;
  }

  const startTimeSGT = toZonedTime(data.startTime, TIMEZONE);

  const dateStr = format(startTimeSGT, "EEEE, d MMMM yyyy");
  const timeStr = format(startTimeSGT, "h:mm a");

  try {
    const result = await resend.emails.send({
      from: getFromEmail(),
      to: data.userEmail,
      subject: `Booking Cancelled - ${data.courtName}`,
      html: BookingCancelledEmail({
        userName: data.userName,
        courtName: data.courtName,
        date: dateStr,
        time: timeStr,
        bookingId: data.bookingId,
        refundAmount: data.refundAmount,
      }),
    });

    if (result.error) {
      console.error("Failed to send cancellation email:", {
        error: result.error,
        message: result.error.message,
        name: result.error.name,
        from: getFromEmail(),
        to: data.userEmail,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending cancellation email:", error);
    return false;
  }
}

export async function sendBookingReminderEmail(
  data: Omit<BookingEmailData, "paymentReference"> & { bookingUrl?: string }
): Promise<boolean> {
  const resend = getResendClient();

  if (!resend) {
    console.warn("Resend client not configured - skipping reminder email");
    return false;
  }

  const startTimeSGT = toZonedTime(data.startTime, TIMEZONE);
  const endTimeSGT = toZonedTime(data.endTime, TIMEZONE);

  const dateStr = format(startTimeSGT, "EEEE, d MMMM yyyy");
  const timeStr = `${format(startTimeSGT, "h:mm a")} - ${format(endTimeSGT, "h:mm a")}`;

  // Calculate duration
  const durationMs = data.endTime.getTime() - data.startTime.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  const durationStr = durationHours === 1 ? "1 hour" : `${durationHours} hours`;

  try {
    const result = await resend.emails.send({
      from: getFromEmail(),
      to: data.userEmail,
      subject: `Reminder: ${data.courtName} booking tomorrow at ${format(startTimeSGT, "h:mm a")}`,
      html: BookingReminderEmail({
        userName: data.userName,
        courtName: data.courtName,
        date: dateStr,
        time: timeStr,
        duration: durationStr,
        bookingId: data.bookingId,
        bookingUrl: data.bookingUrl,
      }),
    });

    if (result.error) {
      console.error("Failed to send reminder email:", {
        error: result.error,
        message: result.error.message,
        name: result.error.name,
        from: getFromEmail(),
        to: data.userEmail,
        bookingId: data.bookingId,
      });
      return false;
    }

    console.log("Reminder email sent successfully:", {
      bookingId: data.bookingId,
      to: data.userEmail,
      emailId: result.data?.id,
    });

    return true;
  } catch (error) {
    console.error("Error sending reminder email:", error);
    return false;
  }
}
