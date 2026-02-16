"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimeSlotGrid } from "@/components/booking/time-slot-grid";
import { BookingSummary } from "@/components/booking/booking-summary";
import { createBooking } from "@/lib/actions/booking";
import type { Court } from "@prisma/client";
import type { TimeSlot } from "@/types/court";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, Zap } from "lucide-react";
import Link from "next/link";

interface CourtBookingFormProps {
  court: Court;
  bookableDates: Date[];
  maxSlots: number;
}

export function CourtBookingForm({
  court,
  bookableDates,
  maxSlots,
}: CourtBookingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<Date>(bookableDates[0]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotIndices, setSelectedSlotIndices] = useState<number[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Fetch slots when date changes
  useEffect(() => {
    async function fetchSlots() {
      setIsLoadingSlots(true);
      setSelectedSlotIndices([]);

      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const response = await fetch(
          `/api/courts/${court.id}/availability?date=${dateStr}`
        );
        const data = await response.json();

        if (data.slots) {
          setSlots(
            data.slots.map((s: TimeSlot) => ({
              ...s,
              startTime: new Date(s.startTime),
              endTime: new Date(s.endTime),
            }))
          );
        }
      } catch {
        toast.error("Failed to load available slots");
      } finally {
        setIsLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [selectedDate, court.id]);

  const handleSlotClick = (index: number) => {
    setSelectedSlotIndices((prev) => {
      if (prev.includes(index)) {
        // Deselecting - only allow deselecting from ends
        const min = Math.min(...prev);
        const max = Math.max(...prev);
        if (index === min || index === max) {
          return prev.filter((i) => i !== index);
        }
        return prev;
      }

      // Selecting
      if (prev.length === 0) {
        return [index];
      }

      if (prev.length >= maxSlots) {
        return prev;
      }

      // Must be consecutive
      const min = Math.min(...prev);
      const max = Math.max(...prev);
      if (index === min - 1 || index === max + 1) {
        return [...prev, index].sort((a, b) => a - b);
      }

      return prev;
    });
  };

  const selectedSlots = selectedSlotIndices
    .map((i) => slots[i])
    .filter(Boolean);

  const handleSubmit = () => {
    if (selectedSlots.length === 0) {
      toast.error("Please select at least one time slot");
      return;
    }

    const formData = new FormData();
    formData.append("courtId", court.id);
    formData.append("date", format(selectedDate, "yyyy-MM-dd"));
    formData.append("startTime", format(selectedSlots[0].startTime, "HH:mm"));
    formData.append("slots", selectedSlots.length.toString());

    startTransition(async () => {
      const result = await createBooking(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.success && result.bookingId) {
        toast.success("Booking created! Redirecting to payment...");
        router.push(`/bookings/${result.bookingId}/pay`);
      }
    });
  };

  const pricePerHour = (court.pricePerHourCents / 100).toFixed(0);
  const peakPrice = court.peakPricePerHourCents
    ? (court.peakPricePerHourCents / 100).toFixed(0)
    : null;

  return (
    <div className="space-y-6">
      {/* Court Info Card - removed header since it's in the gradient section now */}
      <Card className="card-elevated border-0 rounded-2xl">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {court.surfaceType && (
              <div className="flex items-center gap-1.5 text-sm bg-secondary px-4 py-2 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {court.surfaceType}
              </div>
            )}
            {court.hasLighting && (
              <div className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1.5 rounded-full">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Lighting
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm bg-primary/10 text-primary px-4 py-2 rounded-full font-semibold">
              ${pricePerHour}/hr
              {peakPrice && (
                <span className="text-primary/70 font-normal">(${peakPrice}/hr peak)</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Date Selection */}
        <Card className="card-elevated border-0 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-semibold">
              <CalendarDays className="h-5 w-5 text-primary" />
              Select Date
            </CardTitle>
            <CardDescription className="text-sm">
              Bookings available up to {bookableDates.length} days ahead
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) =>
                !bookableDates.some(
                  (d) => d.toDateString() === date.toDateString()
                )
              }
              className="rounded-xl"
              classNames={{
                nav: "hidden",
              }}
            />
          </CardContent>
        </Card>

        {/* Time Slot Selection */}
        <Card className="lg:col-span-2 card-elevated border-0 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-semibold">
              <Clock className="h-5 w-5 text-primary" />
              Select Time
            </CardTitle>
            <CardDescription className="text-sm">
              Select up to {maxSlots} consecutive hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSlots ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No slots available for this date
                </p>
              </div>
            ) : (
              <TimeSlotGrid
                slots={slots}
                selectedSlots={selectedSlotIndices}
                onSlotClick={handleSlotClick}
                maxSlots={maxSlots}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Summary & Submit */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BookingSummary
            court={court}
            date={selectedDate}
            selectedSlots={selectedSlots}
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={handleSubmit}
            disabled={selectedSlots.length === 0 || isPending}
            className="w-full h-14 text-lg rounded-full bg-primary hover:bg-primary/90 font-semibold shadow-lg"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Proceed to Payment
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
