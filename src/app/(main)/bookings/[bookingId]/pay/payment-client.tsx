"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Clock, CreditCard, ArrowLeft, MapPin, Loader2, Calendar } from "lucide-react";
import { PaymentMethodSelector, type PaymentOption } from "@/components/booking/payment-method-selector";
import { chargeBookingWithSavedCard, type SavedCardInfo } from "@/lib/actions/payment-methods";
import { formatCardDisplay } from "@/lib/hitpay/recurring";

type BookingType = "COURT_BOOKING" | "CORPORATE_BOOKING" | "PRIVATE_COACHING";

interface BookingSlot {
  id: string;
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface PaymentClientProps {
  booking: {
    id: string;
    type: BookingType;
    slots: BookingSlot[];
    totalCents: number;
    currency: string;
    expiresAt: string | null;
  };
  paymentUrl: string | null;
  savedCard: SavedCardInfo | null;
}

const typeConfig: Record<BookingType, string> = {
  COURT_BOOKING: "Court Booking",
  CORPORATE_BOOKING: "Corporate Booking",
  PRIVATE_COACHING: "Private Coaching",
};

export function PaymentClient({ booking, paymentUrl, savedCard }: PaymentClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentOption>(
    savedCard ? "saved_card" : "new_payment"
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate time remaining
  useEffect(() => {
    if (!booking.expiresAt) return;

    const calculateTimeLeft = () => {
      const expiresAt = new Date(booking.expiresAt!);
      const now = new Date();
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      return diff;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        router.push(`/courts?error=booking_expired`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking.expiresAt, router]);

  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const totalDollars = (booking.totalCents / 100).toFixed(2);
  const bookingTypeLabel = typeConfig[booking.type] || booking.type;

  const handlePayNow = () => {
    if (selectedMethod === "saved_card" && savedCard) {
      setShowConfirmDialog(true);
    } else if (paymentUrl) {
      window.location.href = paymentUrl;
    }
  };

  const handleConfirmSavedCardPayment = () => {
    setError(null);
    startTransition(async () => {
      const result = await chargeBookingWithSavedCard(booking.id);
      if (result.error) {
        setError(result.error);
        setShowConfirmDialog(false);
      } else if (result.success) {
        router.push(`/bookings/${booking.id}/confirmation`);
      }
    });
  };

  const getPayButtonText = () => {
    if (selectedMethod === "saved_card" && savedCard) {
      return `Pay $${totalDollars} with ${formatCardDisplay(savedCard.cardBrand, savedCard.cardLast4)}`;
    }
    return `Continue to Payment`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/courts`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courts
          </Button>
        </Link>
      </div>

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Review & Pay</h1>
        <p className="text-muted-foreground mt-2">
          Review your booking details and complete payment
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">Booking Details</CardTitle>
              {timeLeft !== null && (
                <CardDescription className="mt-1">
                  Complete payment within {formatTimeLeft(timeLeft)} minutes
                </CardDescription>
              )}
            </div>
            {timeLeft !== null && (
              <Badge
                variant={timeLeft < 120 ? "destructive" : "secondary"}
                className="text-base px-3 py-1"
              >
                <Clock className="h-4 w-4 mr-1" />
                {formatTimeLeft(timeLeft)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Booking Date */}
          {booking.slots.length > 0 && (
            <div className="flex items-center gap-2 pb-3 border-b">
              <Calendar className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-lg">{booking.slots[0].date}</span>
              <Badge variant="outline" className="ml-auto">{bookingTypeLabel}</Badge>
            </div>
          )}

          {/* Time Slots */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Time Slots ({booking.slots.length})
            </h3>
            <div className="space-y-2">
              {booking.slots.map((slot, index) => (
                <div key={slot.id} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{slot.courtName}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{slot.startTime} - {slot.endTime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {booking.slots.length} {booking.slots.length === 1 ? 'hour' : 'hours'}
              </span>
              <span className="font-medium">${totalDollars}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold">
                ${totalDollars} {booking.currency}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <PaymentMethodSelector
            savedCard={savedCard}
            selectedMethod={selectedMethod}
            onMethodChange={setSelectedMethod}
          />

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Warning */}
          {timeLeft !== null && timeLeft < 180 && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300 rounded-lg">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Time running out!</p>
                <p className="text-sm">
                  Complete your payment soon or your booking will expire and the
                  slot will be released.
                </p>
              </div>
            </div>
          )}

          {/* Payment Button */}
          {(paymentUrl || (selectedMethod === "saved_card" && savedCard)) ? (
            <Button
              onClick={handlePayNow}
              className="w-full h-14 text-lg"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-5 w-5 mr-2" />
              )}
              {getPayButtonText()}
            </Button>
          ) : (
            <div className="text-center py-4">
              <p className="text-red-600 dark:text-red-400">
                Failed to initialize payment. Please try again or contact support.
              </p>
              <Button
                variant="outline"
                onClick={() => router.refresh()}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Payment Info */}
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center space-y-1">
            {selectedMethod === "saved_card" && savedCard ? (
              <p>Your saved card will be charged immediately.</p>
            ) : (
              <>
                <p>You will be redirected to HitPay to complete payment.</p>
                <p>Choose from PayNow, Card, Apple Pay, or Google Pay.</p>
              </>
            )}
            <p>After payment, you&apos;ll receive a confirmation email.</p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Saved Card */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to pay <strong>${totalDollars} {booking.currency}</strong> using your saved card{" "}
              <strong>{savedCard ? formatCardDisplay(savedCard.cardBrand, savedCard.cardLast4) : "Card"}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSavedCardPayment}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
