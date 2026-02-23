import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/hitpay/client";
import { sendBookingConfirmationEmail } from "@/lib/email/send";
import type { WebhookPayload } from "@/lib/hitpay/types";

/**
 * HitPay payment webhook endpoint
 * Receives payment status updates from HitPay and updates booking/payment records
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
    const adminClient = createAdminSupabaseClient();

    // Find the booking and payment
    const { data: booking } = await adminClient
      .from('bookings')
      .select('*, payments(*), users(*), booking_slots(*, courts(*))')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      console.error("Booking not found:", bookingId);
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Fetch payment separately to avoid one-to-one vs array ambiguity
    const { data: payment } = await adminClient
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (!payment) {
      console.error("Payment record not found for booking:", bookingId);
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 }
      );
    }

    // Handle different payment statuses
    if (payload.status === "completed") {
      // Payment successful - use RPC for atomic update
      await adminClient.rpc('confirm_booking_payment', {
        p_booking_id: bookingId,
        p_payment_method: 'PAYNOW',
        p_hitpay_reference: payload.payment_id,
        p_webhook_payload: JSON.parse(JSON.stringify(payload)),
      });

      // Send confirmation email using first slot for display
      const sortedSlots = [...booking.booking_slots].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      const firstSlot = sortedSlots[0];
      if (firstSlot) {
        await sendBookingConfirmationEmail({
          userEmail: booking.users.email,
          userName: booking.users.name || "Guest",
          courtName:
            sortedSlots.length > 1
              ? `${sortedSlots.length} slots`
              : firstSlot.courts.name,
          startTime: new Date(firstSlot.start_time),
          endTime: new Date(firstSlot.end_time),
          totalCents: booking.total_cents,
          currency: booking.currency,
          bookingId: booking.id,
          paymentReference: payload.payment_id,
        });
      }

    } else if (payload.status === "failed") {
      // Payment failed
      await adminClient
        .from('payments')
        .update({
          status: "FAILED",
          webhook_payload: JSON.parse(JSON.stringify(payload)),
        })
        .eq('id', payment.id);
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
