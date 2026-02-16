"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { savedPaymentMethod: true },
  });

  if (!dbUser?.savedPaymentMethod || !dbUser.savedPaymentMethod.isActive) {
    return null;
  }

  const method = dbUser.savedPaymentMethod;
  return {
    id: method.id,
    cardBrand: method.cardBrand,
    cardLast4: method.cardLast4,
    cardExpiryMonth: method.cardExpiryMonth,
    cardExpiryYear: method.cardExpiryYear,
    isActive: method.isActive,
  };
}

/**
 * Initiate the save card flow
 * Creates a HitPay billing session and returns the redirect URL
 */
export async function initiateSaveCard(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

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

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { savedPaymentMethod: true },
  });

  if (!dbUser) {
    return { error: "User not found" };
  }

  if (!dbUser.savedPaymentMethod) {
    return { error: "No saved payment method found" };
  }

  try {
    // Delete from HitPay
    await deleteSavedCard(dbUser.savedPaymentMethod.hitpayBillingId);
  } catch (error) {
    console.error("Failed to delete card from HitPay:", error);
    // Continue with local deletion even if HitPay fails
  }

  // Delete from our database
  await prisma.savedPaymentMethod.delete({
    where: { id: dbUser.savedPaymentMethod.id },
  });

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

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { savedPaymentMethod: true },
  });

  if (!dbUser) {
    return { error: "User not found" };
  }

  if (!dbUser.savedPaymentMethod || !dbUser.savedPaymentMethod.isActive) {
    return { error: "No saved payment method found" };
  }

  // Get the booking
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) {
    return { error: "Booking not found" };
  }

  if (booking.userId !== dbUser.id) {
    return { error: "Unauthorized" };
  }

  if (booking.status !== "PENDING_PAYMENT") {
    return { error: "Booking is not pending payment" };
  }

  try {
    // Charge the saved card
    const chargeResult = await chargeSavedCard({
      billingId: dbUser.savedPaymentMethod.hitpayBillingId,
      amount: booking.totalCents / 100,
      currency: booking.currency,
    });

    if (chargeResult.status === "succeeded") {
      // Update booking and payment
      await prisma.$transaction([
        prisma.booking.update({
          where: { id: bookingId },
          data: { status: "CONFIRMED" },
        }),
        prisma.payment.update({
          where: { bookingId },
          data: {
            status: "COMPLETED",
            method: "SAVED_CARD",
            paidAt: new Date(),
            hitpayPaymentId: chargeResult.payment_id,
          },
        }),
      ]);

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
 * Used to sync card info if webhook was missed
 */
export async function refreshSavedCardDetails(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { savedPaymentMethod: true },
  });

  if (!dbUser?.savedPaymentMethod) {
    return { error: "No saved payment method found" };
  }

  try {
    const cardDetails = await getSavedCardDetails(
      dbUser.savedPaymentMethod.hitpayBillingId
    );

    await prisma.savedPaymentMethod.update({
      where: { id: dbUser.savedPaymentMethod.id },
      data: {
        cardBrand: cardDetails.card_brand?.toLowerCase() || null,
        cardLast4: cardDetails.card_last_four || null,
        cardExpiryMonth: cardDetails.card_expiry_month || null,
        cardExpiryYear: cardDetails.card_expiry_year || null,
      },
    });

    revalidatePath("/profile");

    return { success: true };
  } catch (error) {
    console.error("Failed to refresh card details:", error);
    return { error: "Failed to refresh card details" };
  }
}
