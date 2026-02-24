"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatInTimeZone } from "date-fns-tz";
import { adminCancelBooking } from "@/lib/actions/admin";
import { formatCurrency } from "@/lib/utils";
import type { CalendarBooking } from "./types";

interface BookingDetailSheetProps {
  booking: CalendarBooking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timezone: string;
  orgId: string;
}

function statusBadge(status: string) {
  const styles =
    status === "CONFIRMED"
      ? "bg-green-100 text-green-800"
      : status === "PENDING_PAYMENT"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-block px-2 py-1 text-xs rounded-full ${styles}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function BookingDetailSheet({
  booking,
  open,
  onOpenChange,
  timezone,
  orgId,
}: BookingDetailSheetProps) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  if (!booking) return null;

  async function handleCancel() {
    if (!booking) return;
    setCancelling(true);
    const result = await adminCancelBooking(
      booking.bookingId,
      "Cancelled from calendar",
      orgId
    );
    setCancelling(false);
    if (result.success) {
      onOpenChange(false);
      router.refresh();
    }
  }

  const canCancel =
    booking.status === "CONFIRMED" || booking.status === "PENDING_PAYMENT";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Booking Details</SheetTitle>
          <SheetDescription>
            {booking.courtName} &middot;{" "}
            {formatInTimeZone(booking.startTime, timezone, "EEE, MMM d")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <div>
            <p className="text-sm text-muted-foreground">Player</p>
            <p className="font-medium">{booking.userName}</p>
            <p className="text-sm text-muted-foreground">{booking.userEmail}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Court</p>
            <p className="font-medium">{booking.courtName}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Time</p>
            <p className="font-medium">
              {formatInTimeZone(booking.startTime, timezone, "h:mm a")} &ndash;{" "}
              {formatInTimeZone(booking.endTime, timezone, "h:mm a")}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <div className="mt-1">{statusBadge(booking.status)}</div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="font-medium">
              {formatCurrency(booking.totalCents, booking.currency)}
            </p>
          </div>

          {booking.isAdminOverride && (
            <div>
              <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                Admin Override
              </span>
            </div>
          )}

          {booking.adminNotes && (
            <div>
              <p className="text-sm text-muted-foreground">Admin Notes</p>
              <p className="text-sm">{booking.adminNotes}</p>
            </div>
          )}

          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={cancelling}>
                  {cancelling ? "Cancelling..." : "Cancel Booking"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel the booking for {booking.userName} on{" "}
                    {booking.courtName} at{" "}
                    {formatInTimeZone(booking.startTime, timezone, "h:mm a, MMM d")}
                    . This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
