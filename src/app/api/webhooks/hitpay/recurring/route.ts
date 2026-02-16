import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { RecurringWebhookPayload } from "@/lib/hitpay/recurring";

/**
 * HitPay Recurring Billing Webhook
 * Handles card save confirmations and recurring charge notifications
 *
 * @route POST /api/webhooks/hitpay/recurring
 * @access Public (verified via HMAC signature)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the webhook payload
    const formData = await request.formData();
    const payload: RecurringWebhookPayload = {
      recurring_billing_id: formData.get("recurring_billing_id") as string,
      status: formData.get("status") as string,
      amount: formData.get("amount") as string,
      currency: formData.get("currency") as string,
      customer_email: formData.get("customer_email") as string,
      customer_name: formData.get("customer_name") as string,
      card_brand: formData.get("card_brand") as string | undefined,
      card_last_four: formData.get("card_last_four") as string | undefined,
      card_expiry_month: formData.get("card_expiry_month") as string | undefined,
      card_expiry_year: formData.get("card_expiry_year") as string | undefined,
      reference: formData.get("reference") as string | undefined,
      hmac: formData.get("hmac") as string,
    };

    // Verify webhook signature
    if (!verifyRecurringWebhookSignature(payload)) {
      console.error("Invalid recurring webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Handle different webhook events
    const status = payload.status?.toLowerCase();

    if (status === "active" || status === "saved") {
      // Card has been saved successfully
      await handleCardSaved(payload);
    } else if (status === "completed") {
      // A charge on the saved card completed
      await handleChargeCompleted(payload);
    } else if (status === "failed") {
      // A charge on the saved card failed
      await handleChargeFailed(payload);
    } else if (status === "cancelled" || status === "canceled") {
      // The billing was cancelled
      await handleBillingCancelled(payload);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Recurring webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Verify the webhook signature from HitPay
 */
function verifyRecurringWebhookSignature(
  payload: RecurringWebhookPayload
): boolean {
  const salt = process.env.HITPAY_SALT;
  if (!salt) {
    console.error("HITPAY_SALT is not configured");
    return false;
  }

  const receivedHmac = payload.hmac;
  if (!receivedHmac) {
    return false;
  }

  // Build the string to hash (all fields except hmac, sorted alphabetically)
  const sortedKeys = Object.keys(payload)
    .filter((key) => key !== "hmac")
    .sort();

  const dataString = sortedKeys
    .map((key) => {
      const value = payload[key];
      if (value === null || value === undefined) {
        return "";
      }
      return String(value);
    })
    .join("");

  const computedHmac = crypto
    .createHmac("sha256", salt)
    .update(dataString)
    .digest("hex");

  return computedHmac === receivedHmac;
}

/**
 * Handle successful card save
 */
async function handleCardSaved(payload: RecurringWebhookPayload) {
  const { recurring_billing_id, customer_email, card_brand, card_last_four, card_expiry_month, card_expiry_year } = payload;

  // Find the user by email
  const user = await prisma.user.findUnique({
    where: { email: customer_email },
    include: { savedPaymentMethod: true },
  });

  if (!user) {
    console.error(`User not found for email: ${customer_email}`);
    return;
  }

  // Update or create the saved payment method
  if (user.savedPaymentMethod) {
    // Update existing saved card
    await prisma.savedPaymentMethod.update({
      where: { userId: user.id },
      data: {
        hitpayBillingId: recurring_billing_id,
        cardBrand: card_brand?.toLowerCase() || null,
        cardLast4: card_last_four || null,
        cardExpiryMonth: card_expiry_month || null,
        cardExpiryYear: card_expiry_year || null,
        isActive: true,
      },
    });
  } else {
    // Create new saved payment method
    await prisma.savedPaymentMethod.create({
      data: {
        userId: user.id,
        hitpayBillingId: recurring_billing_id,
        cardBrand: card_brand?.toLowerCase() || null,
        cardLast4: card_last_four || null,
        cardExpiryMonth: card_expiry_month || null,
        cardExpiryYear: card_expiry_year || null,
        isActive: true,
      },
    });
  }
}

/**
 * Handle successful charge on saved card
 */
async function handleChargeCompleted(payload: RecurringWebhookPayload) {
  const { reference } = payload;

  // If reference is a booking ID, update the booking
  if (reference) {
    const booking = await prisma.booking.findUnique({
      where: { id: reference },
      include: { payment: true },
    });

    if (booking && booking.payment) {
      await prisma.$transaction([
        prisma.booking.update({
          where: { id: reference },
          data: { status: "CONFIRMED" },
        }),
        prisma.payment.update({
          where: { id: booking.payment.id },
          data: {
            status: "COMPLETED",
            method: "SAVED_CARD",
            paidAt: new Date(),
          },
        }),
      ]);
    }
  }
}

/**
 * Handle failed charge on saved card
 */
async function handleChargeFailed(payload: RecurringWebhookPayload) {
  const { reference } = payload;

  // If reference is a booking ID, update the payment status
  if (reference) {
    const booking = await prisma.booking.findUnique({
      where: { id: reference },
      include: { payment: true },
    });

    if (booking && booking.payment) {
      await prisma.payment.update({
        where: { id: booking.payment.id },
        data: {
          status: "FAILED",
        },
      });
    }
  }
}

/**
 * Handle billing cancellation
 */
async function handleBillingCancelled(payload: RecurringWebhookPayload) {
  const { recurring_billing_id } = payload;

  // Mark the saved payment method as inactive
  const savedMethod = await prisma.savedPaymentMethod.findUnique({
    where: { hitpayBillingId: recurring_billing_id },
  });

  if (savedMethod) {
    await prisma.savedPaymentMethod.update({
      where: { id: savedMethod.id },
      data: { isActive: false },
    });
  }
}
