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
const TIME_COL_WIDTH = 56; // px
const GRID_START_HOUR = 6; // 6 AM
const GRID_END_HOUR = 23; // 11 PM
const TOTAL_HOURS = GRID_END_HOUR - GRID_START_HOUR;
const HEADER_HEIGHT = 40; // px

function getDayDates(weekStart: string): Date[] {
  const monday = new Date(weekStart + "T12:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function getMinutesFromMidnight(isoStr: string, timezone: string): number {
  const h = parseInt(formatInTimeZone(isoStr, timezone, "H"));
  const m = parseInt(formatInTimeZone(isoStr, timezone, "m"));
  return h * 60 + m;
}

function getDayKeyFromISO(isoStr: string, timezone: string): string {
  return formatInTimeZone(isoStr, timezone, "yyyy-MM-dd");
}

function computeTilePos(startTime: string, endTime: string, timezone: string) {
  const startMin = getMinutesFromMidnight(startTime, timezone);
  const endMin = getMinutesFromMidnight(endTime, timezone);
  const gridStartMin = GRID_START_HOUR * 60;
  const top = ((startMin - gridStartMin) / 60) * ROW_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * ROW_HEIGHT, 15);
  return { top, height };
}

function hourLabel(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export function CourtSheet({ data }: { data: CalendarData }) {
  const { courts, bookings, blocks, weekStart, timezone, orgId } = data;
  const dayDates = useMemo(() => getDayDates(weekStart), [weekStart]);

  // Current time
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

  // Index events by day
  const { bookingsByDay, blocksByDay } = useMemo(() => {
    const bkByDay = new Map<string, CalendarBooking[]>();
    for (const b of bookings) {
      const day = getDayKeyFromISO(b.startTime, timezone);
      if (!bkByDay.has(day)) bkByDay.set(day, []);
      bkByDay.get(day)!.push(b);
    }
    const blByDay = new Map<string, CalendarBlock[]>();
    for (const bl of blocks) {
      const startDay = getDayKeyFromISO(bl.startTime, timezone);
      const endDay = getDayKeyFromISO(bl.endTime, timezone);
      if (!blByDay.has(startDay)) blByDay.set(startDay, []);
      blByDay.get(startDay)!.push(bl);
      if (endDay !== startDay) {
        if (!blByDay.has(endDay)) blByDay.set(endDay, []);
        blByDay.get(endDay)!.push(bl);
      }
    }
    return { bookingsByDay: bkByDay, blocksByDay: blByDay };
  }, [bookings, blocks, timezone]);

  // Court index map for sub-column positioning
  const courtIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    courts.forEach((c, i) => m.set(c.id, i));
    return m;
  }, [courts]);

  const totalCourts = courts.length || 1;
  const todayStr = getDayKeyFromISO(now.toISOString(), timezone);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - GRID_START_HOUR * 60) / 60) * ROW_HEIGHT;
  const bodyHeight = TOTAL_HOURS * ROW_HEIGHT;

  const handleEmptyCellClick = useCallback(
    (dayDate: Date, hour: number) => {
      setBlockPrefill({
        date: dateKey(dayDate),
        hour,
        courtId: courts.length === 1 ? courts[0].id : undefined,
      });
      setCreateBlockOpen(true);
    },
    [courts]
  );

  const handleBookingClick = useCallback((booking: CalendarBooking, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBooking(booking);
    setBookingSheetOpen(true);
  }, []);

  const handleBlockClick = useCallback((block: CalendarBlock, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBlock(block);
    setBlockSheetOpen(true);
  }, []);

  return (
    <div>
      <div className="mb-4">
        <WeekNavigation weekStart={weekStart} />
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <div
          className="overflow-auto"
          style={{ maxHeight: "calc(100vh - 240px)" }}
        >
          {/* Wrapper that enforces min-width for horizontal scroll */}
          <div style={{ minWidth: TIME_COL_WIDTH + 7 * 140 }}>
            {/* Sticky header */}
            <div
              className="sticky top-0 z-20 bg-card border-b flex"
              style={{ height: HEADER_HEIGHT }}
            >
              <div
                className="shrink-0 border-r"
                style={{ width: TIME_COL_WIDTH }}
              />
              {dayDates.map((date) => {
                const dk = dateKey(date);
                const isToday = dk === todayStr;
                const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                const dayNum = date.getDate();
                return (
                  <div
                    key={dk}
                    className={`flex-1 flex items-center justify-center text-sm font-medium border-r ${
                      isToday ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className={isToday ? "text-primary font-bold" : "text-muted-foreground"}>
                      {dayName}
                    </span>
                    &nbsp;
                    <span className={isToday ? "text-primary font-bold" : ""}>
                      {dayNum}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid body */}
            <div className="flex" style={{ height: bodyHeight }}>
              {/* Time labels column */}
              <div className="shrink-0 border-r" style={{ width: TIME_COL_WIDTH }}>
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="border-b text-xs text-muted-foreground text-right pr-2 pt-1"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {hourLabel(GRID_START_HOUR + i)}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {dayDates.map((date, dayIdx) => {
                const dk = dateKey(date);
                const isToday = dk === todayStr;
                const dayBookings = bookingsByDay.get(dk) || [];
                const dayBlocks = blocksByDay.get(dk) || [];

                return (
                  <div
                    key={dk}
                    className={`flex-1 border-r relative ${isToday ? "bg-primary/[0.02]" : ""}`}
                    style={{ height: bodyHeight }}
                  >
                    {/* Hour grid lines (clickable cells) */}
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div
                        key={i}
                        className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                        style={{ height: ROW_HEIGHT }}
                        onClick={() => handleEmptyCellClick(date, GRID_START_HOUR + i)}
                      />
                    ))}

                    {/* Current time line */}
                    {isToday &&
                      nowMinutes >= GRID_START_HOUR * 60 &&
                      nowMinutes <= GRID_END_HOUR * 60 && (
                        <div
                          className="absolute left-0 right-0 z-10 pointer-events-none"
                          style={{ top: nowTop }}
                        >
                          <div className="border-t-2 border-red-500 relative">
                            <div className="absolute -left-1.5 -top-[5px] w-2.5 h-2.5 rounded-full bg-red-500" />
                          </div>
                        </div>
                      )}

                    {/* Block tiles */}
                    {dayBlocks.map((block) => {
                      const { top, height } = computeTilePos(block.startTime, block.endTime, timezone);
                      const courtIdx = courtIndexMap.get(block.courtId) ?? 0;
                      const wPct = 100 / totalCourts;
                      const lPct = courtIdx * wPct;

                      return (
                        <div
                          key={block.id}
                          className="absolute z-[5] cursor-pointer rounded-sm border-l-4 border-gray-500 bg-gray-200 px-1 overflow-hidden text-xs hover:ring-2 hover:ring-gray-400 transition-shadow"
                          style={{
                            top: Math.max(top, 0),
                            height: Math.max(height, 15),
                            left: `calc(${lPct}% + 2px)`,
                            width: `calc(${wPct}% - 4px)`,
                            backgroundImage:
                              "repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 6px)",
                          }}
                          onClick={(e) => handleBlockClick(block, e)}
                        >
                          <p className="font-medium truncate text-gray-700">{block.courtName}</p>
                          <p className="truncate text-gray-500">{block.reason.replaceAll("_", " ")}</p>
                        </div>
                      );
                    })}

                    {/* Booking tiles */}
                    {dayBookings.map((booking, bIdx) => {
                      const { top, height } = computeTilePos(booking.startTime, booking.endTime, timezone);
                      const courtIdx = courtIndexMap.get(booking.courtId) ?? 0;
                      const wPct = 100 / totalCourts;
                      const lPct = courtIdx * wPct;

                      let colorClass = "bg-emerald-50 border-emerald-500";
                      if (booking.status === "PENDING_PAYMENT") {
                        colorClass = "bg-yellow-50 border-yellow-500";
                      } else if (booking.isAdminOverride) {
                        colorClass = "bg-blue-50 border-blue-500";
                      }

                      return (
                        <div
                          key={`${booking.bookingId}-${bIdx}`}
                          className={`absolute z-[5] cursor-pointer rounded-sm border-l-4 ${colorClass} px-1 overflow-hidden text-xs hover:ring-2 hover:ring-primary/40 transition-shadow`}
                          style={{
                            top: Math.max(top, 0),
                            height: Math.max(height, 15),
                            left: `calc(${lPct}% + 2px)`,
                            width: `calc(${wPct}% - 4px)`,
                          }}
                          onClick={(e) => handleBookingClick(booking, e)}
                        >
                          <p className="font-medium truncate">{booking.courtName}</p>
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
                {c.name}{i < courts.length - 1 && ","}
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
