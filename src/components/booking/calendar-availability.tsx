"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, X, Check } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "./countdown-timer";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createMultipleBookings } from "@/lib/actions/booking";
import { toast } from "sonner";
import type { DayAvailability, AggregatedTimeSlot } from "@/lib/booking/aggregated-availability";

interface SelectedSlot {
  slotKey: string; // ISO string of startTime for uniqueness
  startTime: Date;
  endTime: Date;
  courtId: string;
  courtName: string;
  priceInCents: number;
  isPeak: boolean;
}

interface CalendarAvailabilityProps {
  availability: DayAvailability[];
  orgId: string;
  orgSlug: string;
  currency?: string;
}

export function CalendarAvailability({
  availability,
  orgId,
  orgSlug,
  currency = "SGD",
}: CalendarAvailabilityProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);

  const MAX_HOURS = 3;

  const selectedDay = availability.find(
    (day) => day.date.getTime() === selectedDate?.getTime()
  );

  const handleDateClick = (date: Date, isBookable: boolean) => {
    setSelectedDate(date);
    setShowCountdown(!isBookable);
    setExpandedSlot(null); // Close any expanded slot when changing date
  };

  const handleSlotClick = (slot: AggregatedTimeSlot) => {
    const slotKey = slot.startTime.toISOString();

    // Check if this slot is already selected (has a court assigned)
    const existingSelection = selectedSlots.find(s => s.slotKey === slotKey);

    if (existingSelection) {
      // If already selected, collapse it
      setExpandedSlot(null);
    } else if (expandedSlot === slotKey) {
      // If this slot is expanded, collapse it
      setExpandedSlot(null);
    } else {
      // Expand this slot to show court options
      setExpandedSlot(slotKey);
    }
  };

  const handleCourtSelect = (slot: AggregatedTimeSlot, courtId: string, courtName: string, priceInCents: number) => {
    const slotKey = slot.startTime.toISOString();

    // Calculate total hours with this new selection
    const totalHours = selectedSlots.length + 1;

    if (totalHours > MAX_HOURS) {
      alert(`You can only book up to ${MAX_HOURS} hours per day`);
      return;
    }

    // Add the selection
    const newSelection: SelectedSlot = {
      slotKey,
      startTime: slot.startTime,
      endTime: slot.endTime,
      courtId,
      courtName,
      priceInCents,
      isPeak: slot.isPeak,
    };

    setSelectedSlots([...selectedSlots, newSelection]);
    setExpandedSlot(null); // Collapse after selection
  };

  const handleDeselectSlot = (slotKey: string) => {
    setSelectedSlots(selectedSlots.filter(s => s.slotKey !== slotKey));
  };

  const handleBookClick = async () => {
    if (selectedSlots.length === 0) return;

    setIsCreatingBooking(true);

    try {
      const slotsInput = selectedSlots.map((slot) => ({
        courtId: slot.courtId,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        priceInCents: slot.priceInCents,
      }));

      const result = await createMultipleBookings(orgId, slotsInput);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.success && result.bookingId) {
        toast.success("Booking created successfully!");
        // Redirect directly to payment page
        router.push(`/o/${orgSlug}/bookings/${result.bookingId}/pay`);
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Failed to create booking. Please try again.");
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const totalHoursBooked = selectedSlots.length;
  const hoursRemaining = MAX_HOURS - totalHoursBooked;
  const totalPrice = selectedSlots.reduce((sum, slot) => sum + slot.priceInCents, 0);

  if (availability.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No availability information available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-32 md:pb-0">
      {/* Calendar Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold">Book Your Court</h2>
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
            <Clock className="h-4 w-4 text-gray-700" />
            <span className="text-sm font-medium text-gray-900">
              {hoursRemaining}/{MAX_HOURS} hours left
            </span>
          </div>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">
          Select a date, time slot, and choose your court
        </p>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            {format(availability[0].date, "MMMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
              <div
                key={day}
                className="text-center text-xs sm:text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Empty cells for alignment */}
            {availability.length > 0 &&
              Array.from({
                length: (availability[0].date.getDay() + 6) % 7,
              }).map((_, i) => <div key={`empty-${i}`} />)}

            {/* Date cells */}
            {availability.map((day) => {
              const isSelected =
                selectedDate?.getTime() === day.date.getTime();
              const isToday =
                format(day.date, "yyyy-MM-dd") ===
                format(new Date(), "yyyy-MM-dd");

              const hasAvailability = day.slots.some(
                (slot) => slot.availableCount > 0
              );

              return (
                <button
                  key={day.date.toISOString()}
                  onClick={() => handleDateClick(day.date, day.isBookable)}
                  className={cn(
                    "aspect-square rounded-lg p-1 sm:p-2 text-center transition-all relative flex flex-col items-center justify-center",
                    "hover:bg-muted",
                    isSelected &&
                      "bg-gray-900 text-white hover:bg-gray-800",
                    !day.isBookable &&
                      "opacity-50 cursor-pointer hover:opacity-70",
                    isToday && !isSelected && "ring-1 sm:ring-2 ring-gray-900 ring-offset-1 sm:ring-offset-2"
                  )}
                >
                  <div className="text-sm sm:text-lg font-semibold">
                    {format(day.date, "d")}
                  </div>
                  {day.isBookable && !hasAvailability && (
                    <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 leading-tight">
                      <span
                        className={cn(
                          isSelected
                            ? "text-white/80"
                            : "text-gray-900"
                        )}
                      >
                        Full
                      </span>
                    </div>
                  )}
                  {!day.isBookable && (
                    <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 text-muted-foreground leading-tight">
                      Soon
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      {selectedDate && selectedDay && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              {format(selectedDate, "EEEE, d MMMM yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDay.isBookable ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Booking opens in:
                </p>
                {selectedDay.bookingOpensAt ? (
                  <CountdownTimer
                    targetDate={selectedDay.bookingOpensAt}
                    onComplete={() => setShowCountdown(false)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Booking not yet available
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-4">
                  Bookings open 7 days in advance at midnight SGT
                </p>
              </div>
            ) : selectedDay.slots.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No time slots available
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDay.slots.map((slot) => {
                  const isAvailable = slot.availableCount > 0;
                  const startTime = format(slot.startTime, "h:mma");
                  const slotKey = slot.startTime.toISOString();
                  const isExpanded = expandedSlot === slotKey;
                  const selectedSlot = selectedSlots.find(s => s.slotKey === slotKey);
                  const isSelected = !!selectedSlot;

                  return (
                    <div key={slotKey} className="space-y-2">
                      {/* Time Slot Button */}
                      <button
                        onClick={() => isAvailable && handleSlotClick(slot)}
                        disabled={!isAvailable}
                        className={cn(
                          "w-full border rounded-lg p-3 text-left transition-all",
                          isAvailable && !isSelected
                            ? "hover:border-gray-900 hover:bg-gray-50 cursor-pointer"
                            : !isAvailable
                            ? "opacity-50 cursor-not-allowed bg-muted"
                            : "",
                          isSelected && "bg-gray-900 text-white border-gray-900"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <div>
                              <div className="font-semibold text-sm">{startTime}</div>
                              {isSelected ? (
                                <div className="text-xs text-white/80 mt-0.5">
                                  {selectedSlot.courtName} • {formatCurrency(selectedSlot.priceInCents, currency)}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {slot.availableCount}/{slot.totalCourts} courts available
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {slot.isPeak && !isSelected && (
                              <span className="text-[10px] sm:text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                Peak
                              </span>
                            )}
                            {isSelected ? (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeselectSlot(slotKey);
                                }}
                                className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeselectSlot(slotKey);
                                  }
                                }}
                              >
                                <X className="h-4 w-4" />
                              </div>
                            ) : isAvailable ? (
                              <Check className="h-4 w-4 text-gray-400" />
                            ) : null}
                          </div>
                        </div>
                      </button>

                      {/* Expanded Court Selection */}
                      {isExpanded && !isSelected && (
                        <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-2">
                          {slot.courts.map((court) => (
                            <button
                              key={court.courtId}
                              onClick={() => court.isAvailable && handleCourtSelect(slot, court.courtId, court.courtName, court.priceInCents)}
                              disabled={!court.isAvailable}
                              className={cn(
                                "w-full border rounded-lg p-3 text-left transition-all",
                                court.isAvailable
                                  ? "hover:border-gray-900 hover:bg-gray-50 cursor-pointer"
                                  : "opacity-50 cursor-not-allowed bg-muted"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">{court.courtName}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {formatCurrency(court.priceInCents, currency)}/hour
                                    {slot.isPeak && " • Peak rate"}
                                  </div>
                                </div>
                                {court.isAvailable ? (
                                  <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                    Available
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500">
                                    Booked
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sticky Book Button */}
      {selectedSlots.length > 0 && (
        <div
          className="fixed left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg bottom-16 md:bottom-0"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-1">
                  {selectedSlots.length} {selectedSlots.length === 1 ? 'hour' : 'hours'} selected
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(totalPrice, currency)}
                </div>
              </div>
              <Button
                onClick={handleBookClick}
                disabled={isCreatingBooking}
                size="lg"
                className="rounded-full bg-gray-900 hover:bg-gray-800 text-white px-8 h-12"
              >
                {isCreatingBooking ? "Creating Booking..." : "Book Now"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
