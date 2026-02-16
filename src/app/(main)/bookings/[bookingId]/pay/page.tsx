import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";
import { createBookingPayment } from "@/lib/hitpay/client";
import { getSavedPaymentMethod } from "@/lib/actions/payment-methods";
import { PaymentClient } from "./payment-client";

const TIMEZONE = "Asia/Singapore";

interface PaymentPageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const { bookingId } = await params;

  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: true,
      payment: true,
      slots: {
        include: {
          court: true,
        },
        orderBy: {
          startTime: "asc",
        },
      },
    },
  });

  if (!booking) {
    notFound();
  }

  // Check ownership
  if (booking.userId !== dbUser.id && dbUser.role !== "ADMIN") {
    notFound();
  }

  // If already confirmed, redirect to confirmation
  if (booking.status === "CONFIRMED") {
    redirect(`/bookings/${bookingId}/confirmation`);
  }

  // If expired or cancelled, show error
  if (booking.status === "EXPIRED" || booking.status === "CANCELLED") {
    redirect(`/bookings/${bookingId}?error=expired`);
  }

  // Check if booking has expired
  if (booking.expiresAt && new Date() > booking.expiresAt) {
    // Mark as expired
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "EXPIRED", cancelledAt: new Date(), cancelReason: "Payment timeout - booking expired after 10 minutes" },
    });
    redirect(`/?error=booking_expired`);
  }

  // Create HitPay payment if not already created
  let payment = booking.payment;

  if (payment && !payment.hitpayPaymentId && booking.slots.length > 0) {
    const firstSlot = booking.slots[0];
    const startTimeSGT = toZonedTime(firstSlot.startTime, TIMEZONE);
    const slotCount = booking.slots.length;
    const courtNames = [...new Set(booking.slots.map((s) => s.court.name))].join(", ");

    try {
      const hitpayResponse = await createBookingPayment({
        bookingId: booking.id,
        amountCents: booking.totalCents,
        currency: booking.currency,
        userEmail: booking.user.email,
        userName: booking.user.name || undefined,
        courtName: slotCount > 1 ? `${slotCount} slots (${courtNames})` : firstSlot.court.name,
        bookingDate: format(startTimeSGT, "d MMM yyyy"),
        bookingTime: slotCount > 1 ? `${slotCount} time slots` : format(startTimeSGT, "h:mm a"),
      });

      // Update payment with HitPay details
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          hitpayPaymentId: hitpayResponse.id,
          hitpayPaymentUrl: hitpayResponse.url,
        },
      });
    } catch (error) {
      console.error("Failed to create HitPay payment:", error);
      // Continue with page render, will show error
    }
  }

  // Format slots for display
  const formattedSlots = booking.slots.map((slot) => {
    const startTimeSGT = toZonedTime(slot.startTime, TIMEZONE);
    const endTimeSGT = toZonedTime(slot.endTime, TIMEZONE);
    return {
      id: slot.id,
      courtName: slot.court.name,
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
        totalCents: booking.totalCents,
        currency: booking.currency,
        expiresAt: booking.expiresAt?.toISOString() || null,
      }}
      paymentUrl={payment?.hitpayPaymentUrl || null}
      savedCard={savedCard}
    />
  );
}
