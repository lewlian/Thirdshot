import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  CreditCard,
  Receipt
} from "lucide-react";
import { CancelBookingButton } from "./cancel-button";

const TIMEZONE = "Asia/Singapore";

type BookingType = "COURT_BOOKING" | "CORPORATE_BOOKING" | "PRIVATE_COACHING";

const typeConfig: Record<BookingType, string> = {
  COURT_BOOKING: "Court Booking",
  CORPORATE_BOOKING: "Corporate Booking",
  PRIVATE_COACHING: "Private Coaching",
};

interface BookingDetailPageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
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
      payment: true,
      slots: {
        include: { court: true },
        orderBy: { startTime: "asc" },
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

  const firstSlot = booking.slots[0];
  const startTimeSGT = firstSlot ? toZonedTime(firstSlot.startTime, TIMEZONE) : new Date();
  const totalDollars = (booking.totalCents / 100).toFixed(2);
  const bookingTypeLabel = typeConfig[booking.type as BookingType] || booking.type;

  const isUpcoming = firstSlot && new Date(firstSlot.startTime) > new Date();
  const canCancel = booking.status === "CONFIRMED" && isUpcoming;
  const isPending = booking.status === "PENDING_PAYMENT";

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING_PAYMENT: { label: "Pending Payment", variant: "secondary" },
    CONFIRMED: { label: "Confirmed", variant: "default" },
    CANCELLED: { label: "Cancelled", variant: "destructive" },
    EXPIRED: { label: "Expired", variant: "outline" },
    COMPLETED: { label: "Completed", variant: "outline" },
  };

  const status = statusConfig[booking.status] || { label: booking.status, variant: "outline" as const };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/bookings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Booking Details</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">{bookingTypeLabel}</Badge>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Booking Slots */}
          <div className="space-y-4">
            <h3 className="font-medium text-lg">
              {bookingTypeLabel}
            </h3>

            {booking.slots.map((slot, index) => {
              const slotStartSGT = toZonedTime(slot.startTime, TIMEZONE);
              const slotEndSGT = toZonedTime(slot.endTime, TIMEZONE);

              return (
                <div key={slot.id} className="space-y-3 text-sm border-b pb-4 last:border-b-0">
                  {booking.slots.length > 1 && (
                    <div className="font-medium text-gray-900">Slot {index + 1}</div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <span>{slot.court.name} - {slot.court.isIndoor ? "Indoor" : "Outdoor"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <span>{format(slotStartSGT, "EEEE, d MMMM yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <span>
                        {format(slotStartSGT, "h:mm a")} - {format(slotEndSGT, "h:mm a")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Details */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Details
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">${totalDollars} {booking.currency}</span>

              <span className="text-muted-foreground">Payment Status:</span>
              <span>{booking.payment?.status || "N/A"}</span>

              {booking.payment?.method && (
                <>
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span>{booking.payment.method}</span>
                </>
              )}

              {booking.payment?.paidAt && (
                <>
                  <span className="text-muted-foreground">Paid At:</span>
                  <span>{format(toZonedTime(booking.payment.paidAt, TIMEZONE), "d MMM yyyy, h:mm a")}</span>
                </>
              )}
            </div>
          </div>

          {/* Cancellation Reason */}
          {(booking.status === "CANCELLED" || booking.status === "EXPIRED") && booking.cancelReason && (
            <div className="border-t pt-4 space-y-2">
              <h4 className="font-medium text-sm">Cancellation Reason</h4>
              <p className="text-sm text-muted-foreground">{booking.cancelReason}</p>
              {booking.cancelledAt && (
                <p className="text-xs text-muted-foreground">
                  Cancelled on {format(toZonedTime(booking.cancelledAt, TIMEZONE), "d MMM yyyy, h:mm a")}
                </p>
              )}
            </div>
          )}

          {/* Reference Numbers */}
          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Booking ID:</span>
              <code className="bg-muted px-2 py-0.5 rounded text-xs">{booking.id}</code>
            </div>
            {booking.payment?.hitpayReferenceNo && (
              <div className="flex items-center gap-2">
                <span className="ml-6 text-muted-foreground">Payment Reference:</span>
                <code className="bg-muted px-2 py-0.5 rounded text-xs">
                  {booking.payment.hitpayReferenceNo}
                </code>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t pt-4 flex flex-col sm:flex-row gap-3">
            {isPending && (
              <Button asChild className="flex-1">
                <Link href={`/bookings/${bookingId}/pay`}>Complete Payment</Link>
              </Button>
            )}

            {canCancel && (
              <CancelBookingButton bookingId={bookingId} />
            )}

            <Button asChild variant="outline" className="flex-1">
              <Link href="/courts">Book Another Court</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
