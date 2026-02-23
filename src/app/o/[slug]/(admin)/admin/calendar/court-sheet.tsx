"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { WeekNavigation } from "./week-navigation";
import { BookingDetailSheet } from "./booking-detail-sheet";
import { BlockDetailSheet } from "./block-detail-sheet";
import { CreateBlockDialog } from "./create-block-dialog";
import type {
  CalendarData,
  CalendarBooking,
  CalendarBlock,
} from "./types";

const ROW_HEIGHT = 60; // px per hour
const TIME_COL_WIDTH = 60; // px
const MIN_DAY_WIDTH = 150; // px
const GRID_START_HOUR = 6; // 6 AM
const GRID_END_HOUR = 23; // 11 PM
const TOTAL_HOURS = GRID_END_HOUR - GRID_START_HOUR;

function getDayDates(weekStart: string): Date[] {
  const monday = new Date(weekStart + "T12:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getMinutesFromMidnight(isoStr: string, timezone: string): number {
  const h = parseInt(formatInTimeZone(isoStr, timezone, "H"));
  const m = parseInt(formatInTimeZone(isoStr, timezone, "m"));
  return h * 60 + m;
}

function getDayKey(isoStr: string, timezone: string): string {
  return formatInTimeZone(isoStr, timezone, "yyyy-MM-dd");
}

interface TileStyle {
  top: number;
  height: number;
}

function computeTileStyle(
  startTime: string,
  endTime: string,
  timezone: string
): TileStyle {
  const startMin = getMinutesFromMidnight(startTime, timezone);
  const endMin = getMinutesFromMidnight(endTime, timezone);
  const gridStartMin = GRID_START_HOUR * 60;

  const top = ((startMin - gridStartMin) / 60) * ROW_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * ROW_HEIGHT, ROW_HEIGHT / 4);
  return { top, height };
}

export function CourtSheet({ data }: { data: CalendarData }) {
  const { courts, bookings, blocks, weekStart, timezone, orgId, orgSlug } = data;
  const dayDates = useMemo(() => getDayDates(weekStart), [weekStart]);

  // Current time indicator
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Detail panels
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<CalendarBlock | null>(null);
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);

  // Create block dialog
  const [createBlockOpen, setCreateBlockOpen] = useState(false);
  const [blockPrefill, setBlockPrefill] = useState<{
    courtId?: string;
    date?: string;
    hour?: number;
  }>({});

  // Index bookings and blocks by day
  const { bookingsByDay, blocksByDay } = useMemo(() => {
    const bkByDay = new Map<string, CalendarBooking[]>();
    for (const b of bookings) {
      const day = getDayKey(b.startTime, timezone);
      if (!bkByDay.has(day)) bkByDay.set(day, []);
      bkByDay.get(day)!.push(b);
    }

    const blByDay = new Map<string, CalendarBlock[]>();
    for (const bl of blocks) {
      // A block might span multiple days
      const startDay = getDayKey(bl.startTime, timezone);
      const endDay = getDayKey(bl.endTime, timezone);
      // For simplicity, add to start day (most blocks are single-day)
      if (!blByDay.has(startDay)) blByDay.set(startDay, []);
      blByDay.get(startDay)!.push(bl);
      if (endDay !== startDay) {
        if (!blByDay.has(endDay)) blByDay.set(endDay, []);
        blByDay.get(endDay)!.push(bl);
      }
    }

    return { bookingsByDay: bkByDay, blocksByDay: blByDay };
  }, [bookings, blocks, timezone]);

  const handleEmptyCellClick = useCallback(
    (dayDate: Date, hour: number) => {
      const pad = (n: number) => n.toString().padStart(2, "0");
      const dateStr = `${dayDate.getFullYear()}-${pad(dayDate.getMonth() + 1)}-${pad(dayDate.getDate())}`;
      setBlockPrefill({ date: dateStr, hour });
      setCreateBlockOpen(true);
    },
    []
  );

  const handleBookingClick = useCallback((booking: CalendarBooking) => {
    setSelectedBooking(booking);
    setBookingSheetOpen(true);
  }, []);

  const handleBlockClick = useCallback((block: CalendarBlock) => {
    setSelectedBlock(block);
    setBlockSheetOpen(true);
  }, []);

  // Today's date key for current time indicator
  const todayKey = getDayKey(now.toISOString(), timezone);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - GRID_START_HOUR * 60) / 60) * ROW_HEIGHT;

  return (
    <div>
      <div className="mb-4">
        <WeekNavigation weekStart={weekStart} />
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <div
          className="overflow-x-auto overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 240px)" }}
        >
          <div
            className="relative"
            style={{
              minWidth: TIME_COL_WIDTH + 7 * MIN_DAY_WIDTH,
              display: "grid",
              gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(7, minmax(${MIN_DAY_WIDTH}px, 1fr))`,
            }}
          >
            {/* Header row - sticky */}
            <div
              className="sticky top-0 z-20 bg-card border-b"
              style={{ gridColumn: 1 }}
            />
            {dayDates.map((date, i) => {
              const pad = (n: number) => n.toString().padStart(2, "0");
              const dateKey = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
              const isToday = dateKey === todayKey;
              const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
              const dayNum = date.getDate();
              return (
                <div
                  key={dateKey}
                  className={`sticky top-0 z-20 border-b border-l px-2 py-2 text-center text-sm font-medium ${
                    isToday ? "bg-primary/5" : "bg-card"
                  }`}
                  style={{ gridColumn: i + 2 }}
                >
                  <span className={isToday ? "text-primary font-bold" : "text-muted-foreground"}>
                    {dayName}
                  </span>{" "}
                  <span className={isToday ? "text-primary font-bold" : ""}>
                    {dayNum}
                  </span>
                </div>
              );
            })}

            {/* Time rows + day columns */}
            {Array.from({ length: TOTAL_HOURS }, (_, hourIdx) => {
              const hour = GRID_START_HOUR + hourIdx;
              const label =
                hour === 0
                  ? "12 AM"
                  : hour < 12
                    ? `${hour} AM`
                    : hour === 12
                      ? "12 PM"
                      : `${hour - 12} PM`;

              return (
                <div key={hour} style={{ display: "contents" }}>
                  {/* Time label */}
                  <div
                    className="border-b px-1 text-xs text-muted-foreground flex items-start justify-end pr-2 pt-1"
                    style={{ height: ROW_HEIGHT, gridColumn: 1 }}
                  >
                    {label}
                  </div>
                  {/* Day cells */}
                  {dayDates.map((date, dayIdx) => {
                    const pad = (n: number) => n.toString().padStart(2, "0");
                    const dateKey = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                    const isToday = dateKey === todayKey;

                    return (
                      <div
                        key={`${dateKey}-${hour}`}
                        className={`border-b border-l relative cursor-pointer hover:bg-muted/30 transition-colors ${
                          isToday ? "bg-primary/[0.02]" : ""
                        }`}
                        style={{
                          height: ROW_HEIGHT,
                          gridColumn: dayIdx + 2,
                        }}
                        onClick={() => handleEmptyCellClick(date, hour)}
                      />
                    );
                  })}
                </div>
              );
            })}

            {/* Overlay: bookings, blocks, and current time line */}
            {/* We overlay tiles on top of the grid cells */}
            {dayDates.map((date, dayIdx) => {
              const pad = (n: number) => n.toString().padStart(2, "0");
              const dateKey = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
              const dayBookings = bookingsByDay.get(dateKey) || [];
              const dayBlocks = blocksByDay.get(dateKey) || [];
              const isToday = dateKey === todayKey;

              // Group bookings by overlapping time to lay out side-by-side
              // Sort by court sort_order for consistent positioning
              const courtIndexMap = new Map<string, number>();
              courts.forEach((c, i) => courtIndexMap.set(c.id, i));

              return (
                <div
                  key={`overlay-${dateKey}`}
                  className="pointer-events-none"
                  style={{
                    gridColumn: dayIdx + 2,
                    gridRow: "2 / -1",
                    position: "relative",
                    height: TOTAL_HOURS * ROW_HEIGHT,
                  }}
                >
                  {/* Current time indicator */}
                  {isToday &&
                    nowMinutes >= GRID_START_HOUR * 60 &&
                    nowMinutes <= GRID_END_HOUR * 60 && (
                      <div
                        className="absolute left-0 right-0 z-10 border-t-2 border-red-500"
                        style={{ top: nowTop }}
                      >
                        <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                      </div>
                    )}

                  {/* Block tiles */}
                  {dayBlocks.map((block) => {
                    const { top, height } = computeTileStyle(
                      block.startTime,
                      block.endTime,
                      timezone
                    );
                    const courtIdx = courtIndexMap.get(block.courtId) ?? 0;
                    const totalCourts = courts.length || 1;
                    const widthPercent = 100 / totalCourts;
                    const leftPercent = courtIdx * widthPercent;

                    return (
                      <div
                        key={block.id}
                        className="absolute pointer-events-auto cursor-pointer rounded-sm border-l-4 border-gray-500 bg-gray-200 px-1 overflow-hidden text-xs hover:ring-2 hover:ring-gray-400"
                        style={{
                          top: Math.max(top, 0),
                          height: Math.max(height, 15),
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${widthPercent}% - 4px)`,
                          backgroundImage:
                            "repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 6px)",
                        }}
                        onClick={() => handleBlockClick(block)}
                      >
                        <p className="font-medium truncate text-gray-700">
                          {block.courtName}
                        </p>
                        <p className="truncate text-gray-500">
                          {block.reason.replace("_", " ")}
                        </p>
                      </div>
                    );
                  })}

                  {/* Booking tiles */}
                  {dayBookings.map((booking, bIdx) => {
                    const { top, height } = computeTileStyle(
                      booking.startTime,
                      booking.endTime,
                      timezone
                    );
                    const courtIdx = courtIndexMap.get(booking.courtId) ?? 0;
                    const totalCourts = courts.length || 1;
                    const widthPercent = 100 / totalCourts;
                    const leftPercent = courtIdx * widthPercent;

                    let tileStyle = "bg-emerald-50 border-emerald-500";
                    if (booking.status === "PENDING_PAYMENT") {
                      tileStyle = "bg-yellow-50 border-yellow-500";
                    } else if (booking.isAdminOverride) {
                      tileStyle = "bg-blue-50 border-blue-500";
                    }

                    return (
                      <div
                        key={`${booking.bookingId}-${bIdx}`}
                        className={`absolute pointer-events-auto cursor-pointer rounded-sm border-l-4 ${tileStyle} px-1 overflow-hidden text-xs hover:ring-2 hover:ring-primary/40`}
                        style={{
                          top: Math.max(top, 0),
                          height: Math.max(height, 15),
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${widthPercent}% - 4px)`,
                        }}
                        onClick={() => handleBookingClick(booking)}
                      >
                        <p className="font-medium truncate">
                          {booking.courtName}
                        </p>
                        <p className="truncate">{booking.userName}</p>
                        {height > 30 && (
                          <p className="truncate text-muted-foreground">
                            {formatInTimeZone(booking.startTime, timezone, "h:mm a")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-50 border-l-2 border-emerald-500" />
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-yellow-50 border-l-2 border-yellow-500" />
          <span>Pending Payment</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-50 border-l-2 border-blue-500" />
          <span>Admin Override</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gray-200 border-l-2 border-gray-500" />
          <span>Court Block</span>
        </div>
        {courts.length > 1 && (
          <div className="flex items-center gap-1.5 ml-2 border-l pl-3">
            <span>Courts:</span>
            {courts.map((c, i) => (
              <span key={c.id} className="font-medium">
                {c.name}
                {i < courts.length - 1 && ","}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Detail sheets */}
      <BookingDetailSheet
        booking={selectedBooking}
        open={bookingSheetOpen}
        onOpenChange={setBookingSheetOpen}
        timezone={timezone}
        orgId={orgId}
      />
      <BlockDetailSheet
        block={selectedBlock}
        open={blockSheetOpen}
        onOpenChange={setBlockSheetOpen}
        timezone={timezone}
        orgId={orgId}
      />
      <CreateBlockDialog
        open={createBlockOpen}
        onOpenChange={setCreateBlockOpen}
        courts={courts}
        prefillCourtId={blockPrefill.courtId}
        prefillDate={blockPrefill.date}
        prefillHour={blockPrefill.hour}
        orgId={orgId}
        timezone={timezone}
      />
    </div>
  );
}
