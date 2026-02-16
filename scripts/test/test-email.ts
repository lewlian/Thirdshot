// Quick test script for email functionality
// Run with: npx tsx scripts/test-email.ts

import "dotenv/config";
import { Resend } from "resend";
import { BookingConfirmationEmail } from "../../src/lib/email/templates/booking-confirmation";

async function testEmail() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("RESEND_API_KEY not set in environment");
    process.exit(1);
  }

  console.log("Testing email with Resend...");
  console.log("API Key prefix:", apiKey.substring(0, 10) + "...");

  const resend = new Resend(apiKey);

  const testEmail = process.env.FROM_EMAIL || "test@example.com";

  try {
    const { data, error } = await resend.emails.send({
      from: testEmail,
      to: testEmail, // Send to yourself for testing
      subject: "Thirdshot Test Email - Booking Confirmation",
      html: BookingConfirmationEmail({
        userName: "Test User",
        courtName: "Court A - Indoor",
        date: "Monday, 13 January 2026",
        time: "10:00 AM - 11:00 AM",
        duration: "1 hour",
        totalAmount: "$20.00 SGD",
        bookingId: "test-booking-123",
        paymentReference: "HP-TEST-REF",
      }),
    });

    if (error) {
      console.error("Email send failed:", error);
      process.exit(1);
    }

    console.log("Email sent successfully!");
    console.log("Email ID:", data?.id);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

testEmail();
