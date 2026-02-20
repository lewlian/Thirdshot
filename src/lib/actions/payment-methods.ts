"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/server";
import {
  createSaveCardSession,
  getSavedCardDetails,
  chargeSavedCard,
  deleteSavedCard,
} from "@/lib/hitpay/recurring";

// ============================================
// Types
// ============================================

export type SavedCardInfo = {
  id: string;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpiryMonth: string | null;
  cardExpiryYear: string | null;
  isActive: boolean;
};

export type ActionResult = {
  success?: boolean;
  error?: string;
  redirectUrl?: string;
};

// ============================================
// Server Actions
// ============================================

/**
 * Get the current user's saved payment method
 */
export async function getSavedPaymentMethod(): Promise<SavedCardInfo | null> {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const supabase = await createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('*, saved_payment_methods(*)')
    .eq('supabase_id', user.id)
    .single();

  const savedMethod = dbUser?.saved_payment_methods;
  if (!savedMethod || !savedMethod.is_active) {
    return null;
  }

  return {
    id: savedMethod.id,
    cardBrand: savedMethod.card_brand,
    cardLast4: savedMethod.card_last_4,
    cardExpiryMonth: savedMethod.card_expiry_month,
    cardExpiryYear: savedMethod.card_expiry_year,
    isActive: savedMethod.is_active,
  };
}

/**
 * Initiate the save card flow
 */
export async function initiateSaveCard(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_id', user.id)
    .single();

  if (!dbUser) {
    return { error: "User not found" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const session = await createSaveCardSession({
      customerEmail: dbUser.email,
      customerName: dbUser.name || dbUser.email,
      redirectUrl: `${appUrl}/profile?saved=true`,
      webhook: `${appUrl}/api/webhooks/hitpay/recurring`,
      reference: dbUser.id,
    });

    return {
      success: true,
      redirectUrl: session.url,
    };
  } catch (error) {
    console.error("Failed to create save card session:", error);
    return { error: "Failed to initiate card save. Please try again." };
  }
}

/**
 * Remove the user's saved payment method
 */
export async function removeSavedPaymentMethod(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('*, saved_payment_methods(*)')
    .eq('supabase_id', user.id)
    .single();

  if (!dbUser) {
    return { error: "User not found" };
  }

  const savedMethod = dbUser.saved_payment_methods;
  if (!savedMethod) {
    return { error: "No saved payment method found" };
  }

  try {
    // Delete from HitPay
    await deleteSavedCard(savedMethod.hitpay_billing_id);
  } catch (error) {
    console.error("Failed to delete card from HitPay:", error);
    // Continue with local deletion even if HitPay fails
  }

  // Delete from our database
  await supabase
    .from('saved_payment_methods')
    .delete()
    .eq('id', savedMethod.id);

  revalidatePath("/profile");

  return { success: true };
}

/**
 * Charge the saved card for a booking
 */
export async function chargeBookingWithSavedCard(
  bookingId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('*, saved_payment_methods(*)')
    .eq('supabase_id', user.id)
    .single();

  if (!dbUser) {
    return { error: "User not found" };
  }

  const savedMethod = dbUser.saved_payment_methods;
  if (!savedMethod || !savedMethod.is_active) {
    return { error: "No saved payment method found" };
  }

  // Get the booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, payments(*)')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    return { error: "Booking not found" };
  }

  if (booking.user_id !== dbUser.id) {
    return { error: "Unauthorized" };
  }

  if (booking.status !== "PENDING_PAYMENT") {
    return { error: "Booking is not pending payment" };
  }

  try {
    // Charge the saved card
    const chargeResult = await chargeSavedCard({
      billingId: savedMethod.hitpay_billing_id,
      amount: booking.total_cents / 100,
      currency: booking.currency,
    });

    if (chargeResult.status === "succeeded") {
      // Use RPC for atomic update
      await supabase.rpc('confirm_booking_payment', {
        p_booking_id: bookingId,
        p_payment_method: 'SAVED_CARD',
        p_hitpay_reference: chargeResult.payment_id || undefined,
      });

      revalidatePath(`/bookings/${bookingId}`);

      return { success: true };
    } else if (chargeResult.status === "pending") {
      // Payment is processing - webhook will handle final status
      return { success: true };
    } else {
      return {
        error:
          chargeResult.failure_reason || "Payment failed. Please try another payment method.",
      };
    }
  } catch (error) {
    console.error("Failed to charge saved card:", error);
    return { error: "Payment failed. Please try another payment method." };
  }
}

/**
 * Refresh saved card details from HitPay
 */
export async function refreshSavedCardDetails(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('*, saved_payment_methods(*)')
    .eq('supabase_id', user.id)
    .single();

  const savedMethod = dbUser?.saved_payment_methods;
  if (!savedMethod) {
    return { error: "No saved payment method found" };
  }

  try {
    const cardDetails = await getSavedCardDetails(
      savedMethod.hitpay_billing_id
    );

    await supabase
      .from('saved_payment_methods')
      .update({
        card_brand: cardDetails.card_brand?.toLowerCase() || null,
        card_last_4: cardDetails.card_last_four || null,
        card_expiry_month: cardDetails.card_expiry_month || null,
        card_expiry_year: cardDetails.card_expiry_year || null,
      })
      .eq('id', savedMethod.id);

    revalidatePath("/profile");

    return { success: true };
  } catch (error) {
    console.error("Failed to refresh card details:", error);
    return { error: "Failed to refresh card details" };
  }
}
