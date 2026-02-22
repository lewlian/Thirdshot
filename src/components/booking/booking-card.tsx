"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, ChevronRight, Timer } from "lucide-react";

const TIMEZONE = "Asia/Singapore";

type BookingStatus = "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "COMPLETED" | "NO_SHOW";
type BookingType = "COURT_BOOKING" | "CORPORATE_BOOKING" | "PRIVATE_COACHING";

interface BookingSlot {
  id: string;
  start_time: string;
  end_time: string;
  courts: {
    name: string;
    is_indoor: boolean;
  } | null;
}

interface BookingCardProps {
  booking: {
    id: string;
    type: BookingType;
    total_cents: number;
    currency: string;
    status: BookingStatus;
    expires_at?: string | null;
    booking_slots: BookingSlot[];
  };
  linkPrefix?: string;
}

const statusConfig: Record<BookingStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING_PAYMENT: { label: "Pending Payment", variant: "secondary" },
  CONFIRMED: { label: "Confirmed", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  EXPIRED: { label: "Expired", variant: "outline" },
  COMPLETED: { label: "Completed", variant: "outline" },
  NO_SHOW: { label: "No Show", variant: "destructive" },
};

const typeConfig: Record<BookingType, string> = {
  COURT_BOOKING: "Court Booking",
  CORPORATE_BOOKING: "Corporate Booking",
  PRIVATE_COACHING: "Private Coaching",
};

export function BookingCard({ booking, linkPrefix = "" }: BookingCardProps) {
  const router = useRouter();
  const totalDollars = (booking.total_cents / 100).toFixed(2);
  const status = statusConfig[booking.status] || { label: booking.status, variant: "outline" as const };
  const isPending = booking.status === "PENDING_PAYMENT";
  const bookingTypeLabel = typeConfig[booking.type] || booking.type;

  // Countdown timer for pending payments
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    if (!isPending || !booking.expires_at) return;

    const calculateTimeLeft = () => {
      const expiresAt = new Date(booking.expires_at!);
      const now = new Date();
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      return diff;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0 && !hasExpired) {
        clearInterval(interval);
        setHasExpired(true);

        // Wait 2 seconds before refreshing to avoid jittery behavior
        setTimeout(() => {
          router.refresh();
        }, 2000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPending, booking.expires_at, hasExpired, router]);

  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-2">
            <CardTitle className="text-lg">Thirdshot Pickleball</CardTitle>
            <Badge variant="outline" className="w-fit">
              {bookingTypeLabel}
            </Badge>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Display all slots */}
        <div className="space-y-2">
          {booking.booking_slots.map((slot) => {
            const startTimeSGT = toZonedTime(slot.start_time, TIMEZONE);
            const endTimeSGT = toZonedTime(slot.end_time, TIMEZONE);

            return (
              <div key={slot.id} className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">{slot.courts?.name}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {format(startTimeSGT, "h:mm a")} - {format(endTimeSGT, "h:mm a")}
                </span>
              </div>
            );
          })}
        </div>

        {/* Payment timeout warning */}
        {isPending && timeLeft !== null && timeLeft > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className={timeLeft < 120 ? "text-destructive font-medium" : "text-muted-foreground"}>
              Expires in {formatTimeLeft(timeLeft)}
            </span>
          </div>
        )}

        {/* Expired message */}
        {isPending && hasExpired && (
          <div className="flex items-center gap-2 text-sm">
            <Timer className="h-4 w-4 text-destructive" />
            <span className="text-destructive font-medium">
              Booking expired - Refreshing...
            </span>
          </div>
        )}

        {/* Total and actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="font-semibold text-lg">
            ${totalDollars} {booking.currency}
          </span>
          <div className="flex gap-2">
            {isPending && !hasExpired && (
              <Button asChild size="sm">
                <Link href={`${linkPrefix}/bookings/${booking.id}/pay`}>Pay Now</Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href={`${linkPrefix}/bookings/${booking.id}`}>
                View <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
