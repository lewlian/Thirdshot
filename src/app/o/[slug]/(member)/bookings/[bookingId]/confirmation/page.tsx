import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getOrgBySlug } from "@/lib/org-context";
import { getPaymentStatus } from "@/lib/hitpay/client";
import { sendBookingConfirmationEmail } from "@/lib/email/send";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Calendar, Clock, MapPin, XCircle, AlertCircle } from "lucide-react";
import { ConfirmationClient } from "@/app/(main)/bookings/[bookingId]/confirmation/confirmation-client";
import { AddToCalendar } from "@/components/booking/add-to-calendar";
import { generateGoogleCalendarUrl } from "@/lib/calendar/ical";

const TIMEZONE = "Asia/Singapore";

type BookingType = "COURT_BOOKING" | "CORPORATE_BOOKING" | "PRIVATE_COACHING";

const typeConfig: Record<BookingType, string> = {
  COURT_BOOKING: "Court Booking",
  CORPORATE_BOOKING: "Corporate Booking",
  PRIVATE_COACHING: "Private Coaching",
};

interface ConfirmationPageProps {
  params: Promise<{ slug: string; bookingId: string }>;
  searchParams: Promise<{ status?: string }>;
}

async function fetchBooking(bookingId: string) {
  const adminClient = createAdminSupabaseClient();
  const { data } = await adminClient
    .from('bookings')
    .select('*, payments(*), booking_slots(*, courts(*))')
    .eq('id', bookingId)
    .single();
  return data;
}

export default async function ConfirmationPage({
  params,
  searchParams,
}: ConfirmationPageProps) {
  const { slug, bookingId } = await params;
  const { status: queryStatus } = await searchParams;
  const org = await getOrgBySlug(slug);

  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, role, email, name')
    .eq('supabase_id', user.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  const adminClient = createAdminSupabaseClient();
  let booking = await fetchBooking(bookingId);

  if (!booking) {
    notFound();
  }

  // Check ownership
  if (booking.user_id !== dbUser.id && dbUser.role !== "ADMIN") {
    notFound();
  }

  // Fetch payment separately to avoid one-to-one vs array ambiguity
  const { data: payment } = await adminClient
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();

  // If still pending and we have a HitPay payment ID, check the payment status
  if (
    booking.status === "PENDING_PAYMENT" &&
    payment?.hitpay_payment_id
  ) {
    try {
      const hitpayStatus = await getPaymentStatus(payment.hitpay_payment_id);

      // Check if any payment is completed or failed
      const completedPayment = hitpayStatus.payments?.find(
        (p) => p.status === "completed"
      );
      const failedPayment = hitpayStatus.payments?.find(
        (p) => p.status === "failed"
      );

      if (hitpayStatus.status === "completed" || completedPayment) {
        // Update our database to reflect the payment (admin client bypasses RLS)
        await adminClient
          .from('bookings')
          .update({
            status: "CONFIRMED",
            expires_at: null,
          })
          .eq('id', bookingId);

        await adminClient
          .from('payments')
          .update({
            status: "COMPLETED",
            method: "PAYNOW",
            paid_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        // Refresh booking data
        booking = await fetchBooking(bookingId);

        if (!booking) {
          notFound();
        }

        // Send confirmation email (for localhost dev where webhooks don't work)
        const sortedSlots = [...(booking.booking_slots || [])].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
        const firstSlot = sortedSlots[0];
        if (firstSlot) {
          await sendBookingConfirmationEmail({
            userEmail: dbUser.email,
            userName: dbUser.name || "Guest",
            courtName:
              sortedSlots.length > 1
                ? `${sortedSlots.length} slots`
                : firstSlot.courts?.name || "",
            startTime: new Date(firstSlot.start_time),
            endTime: new Date(firstSlot.end_time),
            totalCents: booking.total_cents,
            currency: booking.currency,
            bookingId: booking.id,
          });
        }
      } else if (hitpayStatus.status === "failed" || failedPayment) {
        // Update payment status to FAILED
        await adminClient
          .from('payments')
          .update({ status: "FAILED" })
          .eq('id', payment.id);

        // Refresh booking data to reflect the failed payment
        booking = await fetchBooking(bookingId);

        if (!booking) {
          notFound();
        }
      }
    } catch (error) {
      console.error("Failed to check HitPay status:", error);
      // Continue with current status
    }
  }

  // TypeScript can't track that booking is non-null after notFound() inside nested if
  if (!booking) {
    notFound();
  }

  // Re-fetch payment after potential status update
  const { data: currentPayment } = await adminClient
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  const sortedSlots = [...(booking.booking_slots || [])].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  const firstSlot = sortedSlots[0];
  const startTimeSGT = firstSlot
    ? toZonedTime(firstSlot.start_time, TIMEZONE)
    : new Date();
  const totalDollars = (booking.total_cents / 100).toFixed(2);
  const bookingTypeLabel = typeConfig[booking.type as BookingType] || booking.type;

  // Build calendar data for confirmed bookings
  const lastSlot = sortedSlots[sortedSlots.length - 1];
  const courtName = sortedSlots.length > 1
    ? `${sortedSlots.length} courts`
    : firstSlot?.courts?.name || "Court";
  const calendarUrl = firstSlot && lastSlot
    ? generateGoogleCalendarUrl({
        title: `Pickleball - ${courtName}`,
        description: `Booking ID: ${booking.id}\nCourt: ${courtName}`,
        location: org.address || org.name,
        startTime: new Date(firstSlot.start_time),
        endTime: new Date(lastSlot.end_time),
        bookingId: booking.id,
      })
    : "";

  // Determine status display
  const isConfirmed = booking.status === "CONFIRMED";
  const isPending = booking.status === "PENDING_PAYMENT";
  const isFailed = queryStatus === "failed" || currentPayment?.status === "FAILED";
  const isExpired = booking.status === "EXPIRED";
  const isCancelled = booking.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-background">
      {/* Auto-refresh component when payment is pending */}
      <ConfirmationClient isPending={isPending} isFailed={isFailed} bookingId={bookingId} />

      {/* Header Section with conditional gradient */}
      {isConfirmed && (
        <div className="gradient-blue-bg text-white px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
            <p className="text-white/90 text-base">
              Your court has been reserved. A confirmation email has been sent.
            </p>
          </div>
        </div>
      )}

      <div className={`max-w-2xl mx-auto px-4 ${isConfirmed ? '-mt-6' : 'py-8'}`}>
        <Card className={`card-elevated border-0 rounded-2xl ${!isConfirmed ? 'mt-8' : ''}`}>
          {!isConfirmed && (
            <CardHeader className="text-center pb-6">
              {isPending ? (
                <>
                  <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-amber-50 flex items-center justify-center">
                    <AlertCircle className="h-12 w-12 text-amber-500 animate-pulse" />
                  </div>
                  <CardTitle className="text-2xl text-amber-600 font-bold">
                    Checking Payment Status...
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    We're verifying your payment with HitPay. This usually takes a few moments.
                  </CardDescription>
                </>
              ) : isFailed ? (
                <>
                  <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-red-50 flex items-center justify-center">
                    <XCircle className="h-12 w-12 text-red-500" />
                  </div>
                  <CardTitle className="text-2xl text-red-600 font-bold">
                    Payment Failed
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    Your payment could not be processed. Please try again.
                  </CardDescription>
                </>
              ) : isExpired ? (
                <>
                  <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
                    <Clock className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-2xl text-muted-foreground font-bold">
                    Booking Expired
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    This booking has expired due to non-payment.
                  </CardDescription>
                </>
              ) : isCancelled ? (
                <>
                  <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
                    <XCircle className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-2xl text-muted-foreground font-bold">
                    Booking Cancelled
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    This booking has been cancelled.
                  </CardDescription>
                </>
              ) : null}
            </CardHeader>
          )}

        <CardContent className="space-y-6 pt-6">
          {/* Booking Details */}
          <div className="bg-secondary/50 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Booking Details</h3>
              <div className="flex gap-2">
                <Badge variant="outline" className="rounded-full">{bookingTypeLabel}</Badge>
                <Badge
                  className={`rounded-full ${
                    isConfirmed
                      ? "bg-primary text-primary-foreground"
                      : isPending
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {booking.status.replace("_", " ")}
                </Badge>
              </div>
            </div>

            {firstSlot && (
              <div className="pb-3 border-b border-border/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">Date:</span>
                </div>
                <p className="font-semibold ml-6 text-base">
                  {format(startTimeSGT, "EEEE, d MMMM yyyy")}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-medium">Time Slots:</span>
              </div>
              {sortedSlots.map((slot) => {
                const slotStartSGT = toZonedTime(slot.start_time, TIMEZONE);
                const slotEndSGT = toZonedTime(slot.end_time, TIMEZONE);
                return (
                  <div key={slot.id} className="flex items-center gap-2 text-sm ml-6 bg-white rounded-lg p-3">
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-semibold">{slot.courts?.name}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      {format(slotStartSGT, "h:mm a")} - {format(slotEndSGT, "h:mm a")}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border/50 pt-4 flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Total Paid:</span>
              <span className="text-2xl font-bold text-primary">
                ${totalDollars} {booking.currency}
              </span>
            </div>

            {currentPayment?.hitpay_reference_no && (
              <div className="text-sm text-muted-foreground">
                Reference: <span className="font-medium">{currentPayment.hitpay_reference_no}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {isConfirmed && (
              <>
                <Button asChild className="flex-1 rounded-full h-12 font-semibold shadow-sm">
                  <Link href={`/o/${slug}/bookings`}>View My Bookings</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 rounded-full h-12 font-medium border-border/60">
                  <Link href={`/o/${slug}/courts`}>Book Another Court</Link>
                </Button>
                <AddToCalendar bookingId={booking.id} googleCalendarUrl={calendarUrl} />
              </>
            )}

            {isPending && (
              <>
                <Button asChild className="flex-1 rounded-full h-12 font-semibold shadow-sm">
                  <Link href={`/o/${slug}/bookings/${bookingId}/pay`}>
                    Complete Payment
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 rounded-full h-12 font-medium border-border/60">
                  <Link href={`/o/${slug}/courts`}>Cancel & Browse Courts</Link>
                </Button>
              </>
            )}

            {isFailed && (
              <>
                <Button asChild className="flex-1 rounded-full h-12 font-semibold shadow-sm">
                  <Link href={`/o/${slug}/bookings/${bookingId}/pay`}>Try Again</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 rounded-full h-12 font-medium border-border/60">
                  <Link href={`/o/${slug}/courts`}>Browse Courts</Link>
                </Button>
              </>
            )}

            {(isExpired || isCancelled) && (
              <Button asChild className="flex-1 rounded-full h-12 font-semibold shadow-sm">
                <Link href={`/o/${slug}/courts`}>Browse Available Courts</Link>
              </Button>
            )}
          </div>

          {/* Confirmation ID */}
          {isConfirmed && (
            <div className="text-center text-sm text-muted-foreground bg-secondary/30 rounded-lg p-4">
              <p className="font-medium">Booking ID: <span className="font-mono">{booking.id}</span></p>
              <p className="mt-1 text-xs">
                Please save this for your records.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
