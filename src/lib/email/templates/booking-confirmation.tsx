interface BookingConfirmationEmailProps {
  userName: string;
  courtName: string;
  date: string;
  time: string;
  duration: string;
  totalAmount: string;
  bookingId: string;
  paymentReference?: string;
  googleCalendarUrl?: string;
}

export function BookingConfirmationEmail({
  userName,
  courtName,
  date,
  time,
  duration,
  totalAmount,
  bookingId,
  paymentReference,
  googleCalendarUrl,
}: BookingConfirmationEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; padding: 40px;">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <h1 style="color: #16a34a; font-size: 24px; font-weight: 600; margin: 0;">Booking Confirmed!</h1>
            </td>
          </tr>
          <tr>
            <td style="color: #374151; font-size: 16px; line-height: 24px; padding-bottom: 16px;">
              Hi ${userName},
            </td>
          </tr>
          <tr>
            <td style="color: #374151; font-size: 16px; line-height: 24px; padding-bottom: 24px;">
              Great news! Your pickleball court booking has been confirmed.
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">Booking Details</h3>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
              <p style="color: #374151; font-size: 15px; line-height: 24px; margin: 8px 0;"><strong>Court:</strong> ${courtName}</p>
              <p style="color: #374151; font-size: 15px; line-height: 24px; margin: 8px 0;"><strong>Date:</strong> ${date}</p>
              <p style="color: #374151; font-size: 15px; line-height: 24px; margin: 8px 0;"><strong>Time:</strong> ${time}</p>
              <p style="color: #374151; font-size: 15px; line-height: 24px; margin: 8px 0;"><strong>Duration:</strong> ${duration}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
              <p style="color: #374151; font-size: 15px; line-height: 24px; margin: 8px 0;"><strong>Total Paid:</strong> ${totalAmount}</p>
            </td>
          </tr>
          <tr>
            <td style="color: #374151; font-size: 16px; line-height: 24px; padding: 24px 0 16px 0;">
              <strong>Booking ID:</strong> ${bookingId}
            </td>
          </tr>
          ${paymentReference ? `
          <tr>
            <td style="color: #6b7280; font-size: 14px; line-height: 20px; padding-bottom: 16px;">
              Payment Reference: ${paymentReference}
            </td>
          </tr>
          ` : ''}
          ${googleCalendarUrl ? `
          <tr>
            <td align="center" style="padding: 8px 0 16px 0;">
              <a href="${googleCalendarUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 6px;">
                Add to Google Calendar
              </a>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding-top: 16px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;">
            </td>
          </tr>
          <tr>
            <td style="color: #374151; font-size: 16px; line-height: 24px; padding: 16px 0;">
              Please arrive 5-10 minutes before your scheduled time. Remember to bring your own paddle and balls if you have them.
            </td>
          </tr>
          <tr>
            <td style="color: #374151; font-size: 16px; line-height: 24px; padding-bottom: 16px;">
              Need to cancel or modify your booking? Visit your bookings page or contact us.
            </td>
          </tr>
          <tr>
            <td align="center" style="color: #9ca3af; font-size: 12px; padding-top: 32px;">
              Thirdshot - Pickleball Court Booking
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export default BookingConfirmationEmail;
