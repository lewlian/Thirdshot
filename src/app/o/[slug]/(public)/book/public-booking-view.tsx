"use client";

import { useState } from "react";
import { Clock, X, Check, User } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type {
  DayAvailability,
  AggregatedTimeSlot,
} from "@/lib/booking/aggregated-availability";

interface SelectedSlot {
  slotKey: string;
  startTime: Date;
  endTime: Date;
  courtId: string;
  courtName: string;
  priceInCents: number;
  isPeak: boolean;
}

interface GuestInfo {
  name: string;
  email: string;
  phone: string;
}

interface PublicBookingViewProps {
  availability: DayAvailability[];
  orgId: string;
  orgSlug: string;
  orgName: string;
}

export function PublicBookingView({
  availability,
  orgId,
  orgSlug,
  orgName,
}: PublicBookingViewProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    name: "",
    email: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MAX_HOURS = 3;

  const selectedDay = availability.find(
    (day) => day.date.getTime() === selectedDate?.getTime()
  );

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setExpandedSlot(null);
  };

  const handleSlotClick = (slot: AggregatedTimeSlot) => {
    const slotKey = slot.startTime.toISOString();
    const existingSelection = selectedSlots.find((s) => s.slotKey === slotKey);

    if (existingSelection) {
      setExpandedSlot(null);
    } else if (expandedSlot === slotKey) {
      setExpandedSlot(null);
    } else {
      setExpandedSlot(slotKey);
    }
  };

  const handleCourtSelect = (
    slot: AggregatedTimeSlot,
    courtId: string,
    courtName: string,
    priceInCents: number
  ) => {
    const slotKey = slot.startTime.toISOString();

    if (selectedSlots.length + 1 > MAX_HOURS) {
      toast.error(`Maximum ${MAX_HOURS} hours per booking`);
      return;
    }

    setSelectedSlots([
      ...selectedSlots,
      {
        slotKey,
        startTime: slot.startTime,
        endTime: slot.endTime,
        courtId,
        courtName,
        priceInCents,
        isPeak: slot.isPeak,
      },
    ]);
    setExpandedSlot(null);
  };

  const handleDeselectSlot = (slotKey: string) => {
    setSelectedSlots(selectedSlots.filter((s) => s.slotKey !== slotKey));
  };

  const handleProceedToCheckout = () => {
    if (selectedSlots.length === 0) return;
    setShowGuestForm(true);
  };

  const handleGuestBooking = async () => {
    if (!guestInfo.name || !guestInfo.email) {
      toast.error("Please fill in your name and email");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/guest-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          guestName: guestInfo.name,
          guestEmail: guestInfo.email,
          guestPhone: guestInfo.phone || null,
          slots: selectedSlots.map((slot) => ({
            courtId: slot.courtId,
            startTime: slot.startTime.toISOString(),
            endTime: slot.endTime.toISOString(),
            priceInCents: slot.priceInCents,
          })),
        }),
      });

      const result = await response.json();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.bookingId) {
        toast.success("Booking created! Redirecting to payment...");
        router.push(`/o/${orgSlug}/bookings/${result.bookingId}/pay`);
      }
    } catch {
      toast.error("Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPrice = selectedSlots.reduce(
    (sum, slot) => sum + slot.priceInCents,
    0
  );
  const hoursRemaining = MAX_HOURS - selectedSlots.length;

  if (availability.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No availability information available
        </CardContent>
      </Card>
    );
  }

  // Guest info form overlay
  if (showGuestForm) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guest-name">Full Name</Label>
              <Input
                id="guest-name"
                value={guestInfo.name}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, name: e.target.value })
                }
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-email">Email Address</Label>
              <Input
                id="guest-email"
                type="email"
                value={guestInfo.email}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, email: e.target.value })
                }
                placeholder="john@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-phone">Phone (optional)</Label>
              <Input
                id="guest-phone"
                value={guestInfo.phone}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, phone: e.target.value })
                }
                placeholder="+65 9123 4567"
              />
            </div>

            {/* Summary */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium text-sm text-gray-700 mb-2">
                Booking Summary
              </h3>
              {selectedSlots.map((slot) => (
                <div
                  key={slot.slotKey}
                  className="flex justify-between text-sm py-1"
                >
                  <span>
                    {format(slot.startTime, "h:mma")} - {slot.courtName}
                  </span>
                  <span className="font-medium">
                    ${(slot.priceInCents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 border-t mt-2">
                <span>Total</span>
                <span>${(totalPrice / 100).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowGuestForm(false)}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleGuestBooking}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Confirm Booking"}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Already a member?{" "}
              <a href={`/login?redirect=/o/${orgSlug}/book`} className="underline">
                Sign in
              </a>{" "}
              for member pricing
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 md:pb-0">
      {/* Hours Counter */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
          <Clock className="h-4 w-4 text-gray-700" />
          <span className="text-sm font-medium text-gray-900">
            {hoursRemaining}/{MAX_HOURS} hours left
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            {format(availability[0].date, "MMMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
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

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {availability.length > 0 &&
              Array.from({
                length: (availability[0].date.getDay() + 6) % 7,
              }).map((_, i) => <div key={`empty-${i}`} />)}

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
                  onClick={() =>
                    day.isBookable && handleDateClick(day.date)
                  }
                  disabled={!day.isBookable}
                  className={cn(
                    "aspect-square rounded-lg p-1 sm:p-2 text-center transition-all relative flex flex-col items-center justify-center",
                    "hover:bg-muted",
                    isSelected &&
                      "bg-gray-900 text-white hover:bg-gray-800",
                    !day.isBookable &&
                      "opacity-40 cursor-not-allowed",
                    isToday &&
                      !isSelected &&
                      "ring-1 sm:ring-2 ring-gray-900 ring-offset-1 sm:ring-offset-2"
                  )}
                >
                  <div className="text-sm sm:text-lg font-semibold">
                    {format(day.date, "d")}
                  </div>
                  {day.isBookable && !hasAvailability && (
                    <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 leading-tight">
                      <span
                        className={cn(
                          isSelected ? "text-white/80" : "text-gray-900"
                        )}
                      >
                        Full
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Time Slots */}
      {selectedDate && selectedDay && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              {format(selectedDate, "EEEE, d MMMM yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDay.slots.length === 0 ? (
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
                  const selectedSlot = selectedSlots.find(
                    (s) => s.slotKey === slotKey
                  );
                  const isSelected = !!selectedSlot;

                  return (
                    <div key={slotKey} className="space-y-2">
                      <button
                        onClick={() =>
                          isAvailable && handleSlotClick(slot)
                        }
                        disabled={!isAvailable}
                        className={cn(
                          "w-full border rounded-lg p-3 text-left transition-all",
                          isAvailable && !isSelected
                            ? "hover:border-gray-900 hover:bg-gray-50 cursor-pointer"
                            : !isAvailable
                              ? "opacity-50 cursor-not-allowed bg-muted"
                              : "",
                          isSelected &&
                            "bg-gray-900 text-white border-gray-900"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <div>
                              <div className="font-semibold text-sm">
                                {startTime}
                              </div>
                              {isSelected ? (
                                <div className="text-xs text-white/80 mt-0.5">
                                  {selectedSlot.courtName} - $
                                  {(
                                    selectedSlot.priceInCents / 100
                                  ).toFixed(2)}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {slot.availableCount}/{slot.totalCourts}{" "}
                                  courts available
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
                                className="p-1.5 hover:bg-white/20 rounded-full cursor-pointer"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" ||
                                    e.key === " "
                                  ) {
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

                      {isExpanded && !isSelected && (
                        <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-2">
                          {slot.courts.map((court) => (
                            <button
                              key={court.courtId}
                              onClick={() =>
                                court.isAvailable &&
                                handleCourtSelect(
                                  slot,
                                  court.courtId,
                                  court.courtName,
                                  court.priceInCents
                                )
                              }
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
                                  <div className="font-medium text-sm">
                                    {court.courtName}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    $
                                    {(court.priceInCents / 100).toFixed(
                                      2
                                    )}
                                    /hour
                                    {slot.isPeak && " (Peak)"}
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
        <div className="fixed left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg bottom-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-1">
                  {selectedSlots.length}{" "}
                  {selectedSlots.length === 1 ? "hour" : "hours"} selected
                </div>
                <div className="text-lg font-bold text-gray-900">
                  ${(totalPrice / 100).toFixed(2)}
                </div>
              </div>
              <Button
                onClick={handleProceedToCheckout}
                size="lg"
                className="rounded-full bg-gray-900 hover:bg-gray-800 text-white px-8 h-12"
              >
                <User className="h-4 w-4 mr-2" />
                Continue as Guest
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
