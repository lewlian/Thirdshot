import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { RecurringWebhookPayload } from "@/lib/hitpay/recurring";

/**
 * HitPay Recurring Billing Webhook
 * Handles card save confirmations and recurring charge notifications
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
      await handleCardSaved(payload);
    } else if (status === "completed") {
      await handleChargeCompleted(payload);
    } else if (status === "failed") {
      await handleChargeFailed(payload);
    } else if (status === "cancelled" || status === "canceled") {
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

  const adminClient = createAdminSupabaseClient();

  // Find the user by email
  const { data: user } = await adminClient
    .from('users')
    .select('*')
    .eq('email', customer_email)
    .single();

  if (!user) {
    console.error(`User not found for email: ${customer_email}`);
    return;
  }

  // Check if user already has a saved payment method
  const { data: existingMethod } = await adminClient
    .from('saved_payment_methods')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (existingMethod) {
    // Update existing saved card
    await adminClient
      .from('saved_payment_methods')
      .update({
        hitpay_billing_id: recurring_billing_id,
        card_brand: card_brand?.toLowerCase() || null,
        card_last_4: card_last_four || null,
        card_expiry_month: card_expiry_month || null,
        card_expiry_year: card_expiry_year || null,
        is_active: true,
      })
      .eq('user_id', user.id);
  } else {
    // Create new saved payment method
    await adminClient
      .from('saved_payment_methods')
      .insert({
        user_id: user.id,
        hitpay_billing_id: recurring_billing_id,
        card_brand: card_brand?.toLowerCase() || null,
        card_last_4: card_last_four || null,
        card_expiry_month: card_expiry_month || null,
        card_expiry_year: card_expiry_year || null,
        is_active: true,
      });
  }
}

/**
 * Handle successful charge on saved card
 */
async function handleChargeCompleted(payload: RecurringWebhookPayload) {
  const { reference } = payload;

  if (reference) {
    const adminClient = createAdminSupabaseClient();

    const { data: booking } = await adminClient
      .from('bookings')
      .select('*, payments(*)')
      .eq('id', reference)
      .single();

    if (booking && booking.payments) {
      await adminClient.rpc('confirm_booking_payment', {
        p_booking_id: reference,
        p_payment_method: 'SAVED_CARD',
      });
    }
  }
}

/**
 * Handle failed charge on saved card
 */
async function handleChargeFailed(payload: RecurringWebhookPayload) {
  const { reference } = payload;

  if (reference) {
    const adminClient = createAdminSupabaseClient();

    const { data: booking } = await adminClient
      .from('bookings')
      .select('*, payments(*)')
      .eq('id', reference)
      .single();

    if (booking && booking.payments) {
      await adminClient
        .from('payments')
        .update({ status: "FAILED" })
        .eq('id', booking.payments.id);
    }
  }
}

/**
 * Handle billing cancellation
 */
async function handleBillingCancelled(payload: RecurringWebhookPayload) {
  const { recurring_billing_id } = payload;

  const adminClient = createAdminSupabaseClient();

  const { data: savedMethod } = await adminClient
    .from('saved_payment_methods')
    .select('*')
    .eq('hitpay_billing_id', recurring_billing_id)
    .single();

  if (savedMethod) {
    await adminClient
      .from('saved_payment_methods')
      .update({ is_active: false })
      .eq('id', savedMethod.id);
  }
}
