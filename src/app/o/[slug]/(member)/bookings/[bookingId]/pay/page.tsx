import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
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
  const adminClient = createAdminSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('supabase_id', user.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  // Use admin client to fetch booking (bypasses RLS for reliable data access)
  const { data: booking } = await adminClient
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

  // Check if booking has expired by time
  if (booking.expires_at && new Date() > new Date(booking.expires_at)) {
    await adminClient
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
    (a: { start_time: string }, b: { start_time: string }) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  // Create HitPay payment if not already created
  let payment = booking.payments || null;
  let initError: string | null = null;

  // If no payment record exists (edge case), create one
  if (!payment && sortedSlots.length > 0) {
    const { data: newPayment, error: insertErr } = await adminClient
      .from('payments')
      .insert({
        id: crypto.randomUUID(),
        organization_id: booking.organization_id,
        booking_id: booking.id,
        user_id: booking.user_id,
        amount_cents: booking.total_cents,
        currency: booking.currency,
        status: 'PENDING',
      })
      .select()
      .single();
    if (insertErr) {
      console.error("Failed to create payment record:", insertErr.message);
      initError = `Payment record creation failed: ${insertErr.message}`;
    } else if (newPayment) {
      payment = newPayment;
    }
  }

  if (payment && !payment.hitpay_payment_id && sortedSlots.length > 0) {
    const firstSlot = sortedSlots[0];
    const startTimeSGT = toZonedTime(firstSlot.start_time, TIMEZONE);
    const slotCount = sortedSlots.length;
    const courtNames = [...new Set(sortedSlots.map((s: { courts?: { name?: string } }) => s.courts?.name))].join(", ");
    const userEmail = booking.users?.email || "";
    const userName = booking.users?.name || undefined;

    // Validate required data before calling HitPay
    if (!userEmail) {
      initError = "User email is missing — cannot create HitPay payment";
      console.error("HitPay skipped: no user email. booking.users:", JSON.stringify(booking.users));
    } else if (booking.total_cents <= 0) {
      initError = "Booking amount is zero — cannot create HitPay payment";
    } else {
      try {
        const hitpayResponse = await createBookingPayment({
          bookingId: booking.id,
          amountCents: booking.total_cents,
          currency: booking.currency,
          userEmail,
          userName,
          courtName: slotCount > 1 ? `${slotCount} slots (${courtNames})` : firstSlot.courts?.name || "",
          bookingDate: format(startTimeSGT, "d MMM yyyy"),
          bookingTime: slotCount > 1 ? `${slotCount} time slots` : format(startTimeSGT, "h:mm a"),
          orgSlug: slug,
        });

        // Update payment with HitPay details (use admin client)
        const { data: updatedPayment, error: updateErr } = await adminClient
          .from('payments')
          .update({
            hitpay_payment_id: hitpayResponse.id,
            hitpay_payment_url: hitpayResponse.url,
          })
          .eq('id', payment.id)
          .select()
          .single();

        if (updateErr) {
          console.error("Failed to update payment with HitPay details:", updateErr.message);
          // HitPay payment was created but DB update failed — still try to use the URL
          initError = null; // clear since we can still redirect
        }

        if (updatedPayment) {
          payment = updatedPayment;
        } else if (hitpayResponse.url) {
          // DB update failed but we have the URL — use it directly
          payment = { ...payment, hitpay_payment_url: hitpayResponse.url, hitpay_payment_id: hitpayResponse.id };
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("Failed to create HitPay payment:", errorMsg);
        initError = errorMsg;
      }
    }
  } else if (!payment && sortedSlots.length > 0 && !initError) {
    initError = "Payment record could not be created";
  } else if (sortedSlots.length === 0 && !initError) {
    initError = "No booking slots found";
  }

  // Format slots for display
  const formattedSlots = sortedSlots.map((slot: { id: string; start_time: string; end_time: string; courts?: { name?: string } }) => {
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
        expiresAt: booking.expires_at ? new Date(booking.expires_at).toISOString() : null,
      }}
      paymentUrl={payment?.hitpay_payment_url || null}
      savedCard={savedCard}
      linkPrefix={`/o/${slug}`}
      initError={initError}
    />
  );
}
