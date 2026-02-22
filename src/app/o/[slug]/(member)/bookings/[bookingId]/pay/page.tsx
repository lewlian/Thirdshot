import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgBySlug } from "@/lib/org-context";
import { createBookingPayment } from "@/lib/hitpay/client";
import { getSavedPaymentMethod } from "@/lib/actions/payment-methods";
import { PaymentClient } from "@/app/(main)/bookings/[bookingId]/pay/payment-client";

const TIMEZONE = "Asia/Singapore";

interface PaymentPageProps {
  params: Promise<{ slug: string; bookingId: string }>;
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const { slug, bookingId } = await params;
  const org = await getOrgBySlug(slug);

  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('supabase_id', user.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, users(*), payments(*), booking_slots(*, courts(*))')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    notFound();
  }

  // Check ownership
  if (booking.user_id !== dbUser.id && dbUser.role !== "ADMIN") {
    notFound();
  }

  // If already confirmed, redirect to confirmation
  if (booking.status === "CONFIRMED") {
    redirect(`/o/${slug}/bookings/${bookingId}/confirmation`);
  }

  // If expired or cancelled, show error
  if (booking.status === "EXPIRED" || booking.status === "CANCELLED") {
    redirect(`/o/${slug}/bookings/${bookingId}?error=expired`);
  }

  // Check if booking has expired
  if (booking.expires_at && new Date() > new Date(booking.expires_at)) {
    // Mark as expired
    await supabase
      .from('bookings')
      .update({
        status: "EXPIRED",
        cancelled_at: new Date().toISOString(),
        cancel_reason: "Payment timeout - booking expired after 10 minutes",
      })
      .eq('id', bookingId);
    redirect(`/o/${slug}?error=booking_expired`);
  }

  // Sort slots
  const sortedSlots = [...(booking.booking_slots || [])].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  // Create HitPay payment if not already created
  let payment = booking.payments || null;

  if (payment && !payment.hitpay_payment_id && sortedSlots.length > 0) {
    const firstSlot = sortedSlots[0];
    const startTimeSGT = toZonedTime(firstSlot.start_time, TIMEZONE);
    const slotCount = sortedSlots.length;
    const courtNames = [...new Set(sortedSlots.map((s) => s.courts?.name))].join(", ");

    try {
      const hitpayResponse = await createBookingPayment({
        bookingId: booking.id,
        amountCents: booking.total_cents,
        currency: booking.currency,
        userEmail: booking.users?.email || "",
        userName: booking.users?.name || undefined,
        courtName: slotCount > 1 ? `${slotCount} slots (${courtNames})` : firstSlot.courts?.name || "",
        bookingDate: format(startTimeSGT, "d MMM yyyy"),
        bookingTime: slotCount > 1 ? `${slotCount} time slots` : format(startTimeSGT, "h:mm a"),
        orgSlug: slug,
      });

      // Update payment with HitPay details
      const { data: updatedPayment } = await supabase
        .from('payments')
        .update({
          hitpay_payment_id: hitpayResponse.id,
          hitpay_payment_url: hitpayResponse.url,
        })
        .eq('id', payment.id)
        .select()
        .single();

      if (updatedPayment) {
        payment = updatedPayment;
      }
    } catch (error) {
      console.error("Failed to create HitPay payment:", error);
      // Continue with page render, will show error
    }
  }

  // Format slots for display
  const formattedSlots = sortedSlots.map((slot) => {
    const startTimeSGT = toZonedTime(slot.start_time, TIMEZONE);
    const endTimeSGT = toZonedTime(slot.end_time, TIMEZONE);
    return {
      id: slot.id,
      courtName: slot.courts?.name || "",
      date: format(startTimeSGT, "EEEE, d MMMM yyyy"),
      startTime: format(startTimeSGT, "h:mm a"),
      endTime: format(endTimeSGT, "h:mm a"),
    };
  });

  // Get user's saved payment method
  const savedCard = await getSavedPaymentMethod();

  return (
    <PaymentClient
      booking={{
        id: booking.id,
        type: booking.type,
        slots: formattedSlots,
        totalCents: booking.total_cents,
        currency: booking.currency,
        expiresAt: booking.expires_at || null,
      }}
      paymentUrl={payment?.hitpay_payment_url || null}
      savedCard={savedCard}
    />
  );
}
