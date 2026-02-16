interface BookingReminderEmailProps {
  userName: string;
  courtName: string;
  date: string;
  time: string;
  duration: string;
  bookingId: string;
  bookingUrl?: string;
}

export function BookingReminderEmail({
  userName,
  courtName,
  date,
  time,
  duration,
  bookingId,
  bookingUrl,
}: BookingReminderEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Reminder - Tomorrow</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; padding: 40px;">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0;">Booking Reminder</h1>
            </td>
          </tr>
          <tr>
            <td style="color: #374151; font-size: 16px; line-height: 24px; padding-bottom: 16px;">
              Hi ${userName},
            </td>
          </tr>
          <tr>
            <td style="color: #374151; font-size: 16px; line-height: 24px; padding-bottom: 24px;">
              This is a friendly reminder that your pickleball court booking is coming up tomorrow!
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
            </td>
          </tr>
          <tr>
            <td style="color: #374151; font-size: 16px; line-height: 24px; padding-bottom: 16px;">
              <strong>Reminder Checklist:</strong>
            </td>
          </tr>
          <tr>
            <td style="color: #374151; font-size: 15px; line-height: 24px; padding-bottom: 8px;">
              <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Arrive 5-10 minutes early</li>
                <li style="margin-bottom: 8px;">Bring your paddle and balls (if you have them)</li>
                <li style="margin-bottom: 8px;">Wear comfortable court shoes</li>
                <li style="margin-bottom: 8px;">Stay hydrated - bring water!</li>
              </ul>
            </td>
          </tr>
          ${bookingUrl ? `
          <tr>
            <td align="center" style="padding: 24px 0;">
              <a href="${bookingUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">View Booking Details</a>
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
              Need to cancel? Please do so as soon as possible so others can book the slot.
            </td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; line-height: 20px; padding-top: 8px;">
              <strong>Booking ID:</strong> ${bookingId}
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

export default BookingReminderEmail;
