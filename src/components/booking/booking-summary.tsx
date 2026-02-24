"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import type { Court } from "@/types";
import type { TimeSlot } from "@/types/court";

interface BookingSummaryProps {
  court: Court;
  date: Date;
  selectedSlots: TimeSlot[];
  currency?: string;
}

export function BookingSummary({
  court,
  date,
  selectedSlots,
  currency = "SGD",
}: BookingSummaryProps) {
  if (selectedSlots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Booking Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">
            Select time slots to see your booking summary
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalCents = selectedSlots.reduce((sum, slot) => sum + slot.priceInCents, 0);
  const startTime = selectedSlots[0].startTime;
  const endTime = selectedSlots[selectedSlots.length - 1].endTime;

  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString("en-SG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-SG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Booking Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium">{court.name}</p>
          <p className="text-sm text-gray-500">{court.description}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Date</p>
          <p className="font-medium">{formatDate(date)}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Time</p>
          <p className="font-medium">
            {formatTime(startTime)} - {formatTime(endTime)}
          </p>
          <p className="text-sm text-gray-500">
            {selectedSlots.length} hour{selectedSlots.length > 1 ? "s" : ""}
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          {selectedSlots.map((slot, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>
                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                {slot.isPeak && (
                  <span className="ml-1 text-amber-600">(Peak)</span>
                )}
              </span>
              <span>{formatCurrency(slot.priceInCents, currency)}</span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>{formatCurrency(totalCents, currency)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
