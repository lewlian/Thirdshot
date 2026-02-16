interface BookingCancelledEmailProps {
  userName: string;
  courtName: string;
  date: string;
  time: string;
  bookingId: string;
  refundAmount?: string;
}

export function BookingCancelledEmail({
  userName,
  courtName,
  date,
  time,
  bookingId,
  refundAmount,
}: BookingCancelledEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancelled</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; padding: 40px;">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <h1 style="color: #6b7280; font-size: 24px; font-weight: 600; margin: 0;">Booking Cancelled</h1>
            </td>
          </tr>
          <tr>
            <td style="color: #374151; font-size: 16px; line-height: 24px; padding-bottom: 16px;">
              Hi ${userName},
            </td>
          </tr>
          <tr>
            <td style="color: #374151; font-size: 16px; line-height: 24px; padding-bottom: 24px;">
              Your pickleball court booking has been cancelled as requested.
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">Cancelled Booking</h3>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
              <p style="color: #374151; font-size: 15px; line-height: 24px; margin: 8px 0;"><strong>Court:</strong> ${courtName}</p>
              <p style="color: #374151; font-size: 15px; line-height: 24px; margin: 8px 0;"><strong>Date:</strong> ${date}</p>
              <p style="color: #374151; font-size: 15px; line-height: 24px; margin: 8px 0;"><strong>Time:</strong> ${time}</p>
              <p style="color: #374151; font-size: 15px; line-height: 24px; margin: 8px 0;"><strong>Booking ID:</strong> ${bookingId}</p>
            </td>
          </tr>
          ${refundAmount ? `
          <tr>
            <td style="background-color: #ecfdf5; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #047857; font-size: 15px; line-height: 22px; margin: 0;">
                A refund of <strong>${refundAmount}</strong> will be processed within 5-10 business days.
              </p>
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
              Want to book another court? Visit our website to browse available time slots.
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

export default BookingCancelledEmail;
