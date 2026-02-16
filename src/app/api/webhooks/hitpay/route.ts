import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/hitpay/client";
import { sendBookingConfirmationEmail } from "@/lib/email/send";
import type { WebhookPayload } from "@/lib/hitpay/types";

/**
 * HitPay payment webhook endpoint
 * Receives payment status updates from HitPay and updates booking/payment records
 *
 * @route POST /api/webhooks/hitpay
 * @access Public (verified via HMAC signature)
 *
 * Request body (form-data):
 * - payment_id: HitPay payment ID
 * - payment_request_id: HitPay payment request ID
 * - reference_number: Our booking ID
 * - status: Payment status (completed, failed, pending)
 * - amount: Payment amount
 * - currency: Currency code (SGD)
 * - hmac: HMAC signature for verification
 *
 * Response:
 * - 200: Webhook processed successfully
 * - 401: Invalid signature
 * - 404: Booking/Payment not found
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the webhook payload
    const formData = await request.formData();
    const payload: WebhookPayload = {
      payment_id: formData.get("payment_id") as string,
      payment_request_id: formData.get("payment_request_id") as string,
      phone: formData.get("phone") as string | null,
      amount: formData.get("amount") as string,
      currency: formData.get("currency") as string,
      status: formData.get("status") as WebhookPayload["status"],
      reference_number: formData.get("reference_number") as string,
      hmac: formData.get("hmac") as string,
    };

    // Verify webhook signature
    if (!verifyWebhookSignature(payload)) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // The reference_number is our booking ID
    const bookingId = payload.reference_number;

    // Find the booking and payment
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        user: true,
        slots: {
          include: { court: true },
          orderBy: { startTime: "asc" },
        },
      },
    });

    if (!booking) {
      console.error("Booking not found:", bookingId);
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (!booking.payment) {
      console.error("Payment record not found for booking:", bookingId);
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 }
      );
    }

    // Handle different payment statuses
    if (payload.status === "completed") {
      // Payment successful - update booking and payment
      await prisma.$transaction([
        prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "CONFIRMED",
            expiresAt: null, // Clear expiry since payment is complete
          },
        }),
        prisma.payment.update({
          where: { id: booking.payment.id },
          data: {
            status: "COMPLETED",
            method: "PAYNOW",
            hitpayReferenceNo: payload.payment_id,
            paidAt: new Date(),
            webhookPayload: JSON.parse(JSON.stringify(payload)),
          },
        }),
      ]);

      // Send confirmation email using first slot for display
      const firstSlot = booking.slots[0];
      if (firstSlot) {
        await sendBookingConfirmationEmail({
          userEmail: booking.user.email,
          userName: booking.user.name || "Guest",
          courtName:
            booking.slots.length > 1
              ? `${booking.slots.length} slots`
              : firstSlot.court.name,
          startTime: firstSlot.startTime,
          endTime: firstSlot.endTime,
          totalCents: booking.totalCents,
          currency: booking.currency,
          bookingId: booking.id,
          paymentReference: payload.payment_id,
        });
      }

    } else if (payload.status === "failed") {
      // Payment failed
      await prisma.payment.update({
        where: { id: booking.payment.id },
        data: {
          status: "FAILED",
          webhookPayload: JSON.parse(JSON.stringify(payload)),
        },
      });
    }

    // Return success to HitPay
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// HitPay may also send GET requests to verify the endpoint
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
