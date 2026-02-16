"use client";

import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { BookingCard } from "./booking-card";

const TIMEZONE = "Asia/Singapore";

type BookingStatus = "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "COMPLETED" | "NO_SHOW";
type BookingType = "COURT_BOOKING" | "CORPORATE_BOOKING" | "PRIVATE_COACHING";

interface BookingSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  court: {
    name: string;
    isIndoor: boolean;
  };
}

interface Booking {
  id: string;
  type: BookingType;
  totalCents: number;
  currency: string;
  status: BookingStatus;
  expiresAt?: Date | null;
  slots: BookingSlot[];
}

interface BookingListProps {
  bookings: Booking[];
  emptyMessage?: string;
}

export function BookingList({ bookings, emptyMessage = "No bookings found" }: BookingListProps) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Separate bookings with and without slots
  const bookingsWithSlots = bookings.filter(b => b.slots.length > 0);
  const bookingsWithoutSlots = bookings.filter(b => b.slots.length === 0);

  // Group bookings by date (using first slot's date)
  const bookingsByDate = bookingsWithSlots.reduce((acc, booking) => {
    const firstSlot = booking.slots[0];
    const startTimeSGT = toZonedTime(firstSlot.startTime, TIMEZONE);
    const dateKey = format(startTimeSGT, "yyyy-MM-dd");

    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: startTimeSGT,
        bookings: [],
      };
    }

    acc[dateKey].bookings.push(booking);

    return acc;
  }, {} as Record<string, { date: Date; bookings: Booking[] }>);

  // Convert to array and sort by date
  const sortedGroups = Object.values(bookingsByDate).sort((a, b) =>
    b.date.getTime() - a.date.getTime()
  );

  return (
    <div className="space-y-6">
      {sortedGroups.map((group) => (
        <div key={format(group.date, "yyyy-MM-dd")} className="space-y-3">
          {/* Date header */}
          <h3 className="text-sm font-medium text-muted-foreground">
            {format(group.date, "EEEE, d MMMM yyyy")}
          </h3>

          {/* Bookings for this date */}
          <div className="space-y-3">
            {group.bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </div>
      ))}

      {/* Bookings without slots (no date to group by) */}
      {bookingsWithoutSlots.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            No Date Available
          </h3>
          <div className="space-y-3">
            {bookingsWithoutSlots.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
