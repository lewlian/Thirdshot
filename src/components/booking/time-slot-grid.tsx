"use client";

import { cn } from "@/lib/utils";
import type { TimeSlot } from "@/types/court";

interface TimeSlotGridProps {
  slots: TimeSlot[];
  selectedSlots: number[];
  onSlotClick: (index: number) => void;
  maxSlots: number;
}

export function TimeSlotGrid({
  slots,
  selectedSlots,
  onSlotClick,
  maxSlots,
}: TimeSlotGridProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-SG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  const canSelectSlot = (index: number) => {
    if (selectedSlots.length === 0) return true;
    if (selectedSlots.length >= maxSlots) return selectedSlots.includes(index);

    // Must be consecutive
    const minSelected = Math.min(...selectedSlots);
    const maxSelected = Math.max(...selectedSlots);

    return (
      selectedSlots.includes(index) ||
      index === minSelected - 1 ||
      index === maxSelected + 1
    );
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {slots.map((slot, index) => {
        const isSelected = selectedSlots.includes(index);
        const canSelect = slot.isAvailable && canSelectSlot(index);

        return (
          <button
            key={index}
            type="button"
            disabled={!slot.isAvailable || (!isSelected && !canSelect)}
            onClick={() => onSlotClick(index)}
            className={cn(
              "p-3 rounded-lg border text-center transition-all",
              slot.isAvailable
                ? isSelected
                  ? "bg-primary text-white border-primary"
                  : canSelect
                  ? "bg-white hover:border-primary hover:bg-primary/5 cursor-pointer"
                  : "bg-gray-50 text-gray-400 cursor-not-allowed"
                : "bg-gray-100 text-gray-400 cursor-not-allowed line-through"
            )}
          >
            <div className="font-medium text-sm">{formatTime(slot.startTime)}</div>
            <div className="text-xs mt-1">
              {slot.isAvailable ? (
                <>
                  {formatPrice(slot.priceInCents)}
                  {slot.isPeak && (
                    <span className="ml-1 text-amber-600">(Peak)</span>
                  )}
                </>
              ) : (
                "Booked"
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
