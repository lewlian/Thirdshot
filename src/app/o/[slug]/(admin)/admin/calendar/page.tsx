import { Suspense } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgBySlug } from "@/lib/org-context";
import { CourtSheet } from "./court-sheet";
import type { CalendarData, CalendarBooking, CalendarBlock } from "./types";

interface CalendarPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ week?: string }>;
}

function getWeekRange(dateStr: string | undefined, timezone: string) {
  // Parse the date in org timezone, find Monday of that week
  const now = dateStr ? new Date(dateStr + "T12:00:00") : new Date();

  // Get day of week (0=Sun, 1=Mon, ..., 6=Sat)
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  sunday.setHours(0, 0, 0, 0);

  // Format as YYYY-MM-DD for display and ISO for queries
  const pad = (n: number) => n.toString().padStart(2, "0");
  const weekStartDate = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
  const weekEndDate = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;

  // Create ISO strings for Supabase queries (use start/end of day in UTC approximation)
  // We query a wider range to catch timezone edge cases
  const queryStart = new Date(monday);
  queryStart.setHours(0, 0, 0, 0);

  const queryEnd = new Date(sunday);
  queryEnd.setHours(23, 59, 59, 999);

  return {
    weekStartDate,
    weekEndDate,
    weekStartISO: weekStartDate + "T00:00:00",
    weekEndISO: weekEndDate + "T00:00:00",
  };
}

async function getCalendarData(
  orgId: string,
  orgSlug: string,
  timezone: string,
  weekParam?: string
): Promise<CalendarData> {
  const { weekStartDate, weekEndDate, weekStartISO, weekEndISO } =
    getWeekRange(weekParam, timezone);

  const supabase = await createServerSupabaseClient();

  // 3 parallel queries
  const [courtsResult, slotsResult, blocksResult] = await Promise.all([
    // 1. Active courts
    supabase
      .from("courts")
      .select("id, name, sort_order")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("sort_order"),

    // 2. Booking slots for the week with booking + user info
    supabase
      .from("booking_slots")
      .select(
        "id, booking_id, court_id, start_time, end_time, courts(name), bookings!inner(id, status, user_id, is_admin_override, admin_notes, total_cents, currency, users(name, email))"
      )
      .eq("organization_id", orgId)
      .gte("start_time", weekStartISO)
      .lt("start_time", weekEndISO)
      .not("bookings.status", "in", '("CANCELLED","EXPIRED")'),

    // 3. Court blocks overlapping the week
    supabase
      .from("court_blocks")
      .select("id, court_id, start_time, end_time, reason, description, courts(name)")
      .eq("organization_id", orgId)
      .lt("start_time", weekEndISO)
      .gte("end_time", weekStartISO),
  ]);

  const courts = (courtsResult.data || []).map((c) => ({
    id: c.id,
    name: c.name,
    sort_order: c.sort_order,
  }));

  // Group booking slots by booking_id + court_id to merge consecutive slots
  const slotGroups = new Map<
    string,
    {
      bookingId: string;
      courtId: string;
      courtName: string;
      userName: string;
      userEmail: string;
      status: string;
      isAdminOverride: boolean;
      adminNotes: string | null;
      totalCents: number;
      currency: string;
      slots: { start: string; end: string }[];
    }
  >();

  for (const slot of slotsResult.data || []) {
    const booking = slot.bookings as {
      id: string;
      status: string;
      is_admin_override: boolean;
      admin_notes: string | null;
      total_cents: number;
      currency: string;
      users: { name: string | null; email: string } | null;
    };
    const court = slot.courts as { name: string } | null;
    const key = `${booking.id}:${slot.court_id}`;

    if (!slotGroups.has(key)) {
      slotGroups.set(key, {
        bookingId: booking.id,
        courtId: slot.court_id,
        courtName: court?.name || "Unknown",
        userName: booking.users?.name || "No name",
        userEmail: booking.users?.email || "",
        status: booking.status,
        isAdminOverride: booking.is_admin_override,
        adminNotes: booking.admin_notes,
        totalCents: booking.total_cents,
        currency: booking.currency,
        slots: [],
      });
    }
    slotGroups.get(key)!.slots.push({
      start: slot.start_time,
      end: slot.end_time,
    });
  }

  // Merge consecutive slots into single booking tiles
  const bookings: CalendarBooking[] = [];
  for (const group of slotGroups.values()) {
    // Sort slots by start time
    group.slots.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    // Merge consecutive slots
    let mergedStart = group.slots[0].start;
    let mergedEnd = group.slots[0].end;

    for (let i = 1; i < group.slots.length; i++) {
      const slot = group.slots[i];
      if (new Date(slot.start).getTime() === new Date(mergedEnd).getTime()) {
        // Consecutive - extend
        mergedEnd = slot.end;
      } else {
        // Gap - push current merged and start new
        bookings.push({
          bookingId: group.bookingId,
          courtId: group.courtId,
          courtName: group.courtName,
          userName: group.userName,
          userEmail: group.userEmail,
          status: group.status as CalendarBooking["status"],
          isAdminOverride: group.isAdminOverride,
          adminNotes: group.adminNotes,
          totalCents: group.totalCents,
          currency: group.currency,
          startTime: mergedStart,
          endTime: mergedEnd,
        });
        mergedStart = slot.start;
        mergedEnd = slot.end;
      }
    }
    // Push the last merged segment
    bookings.push({
      bookingId: group.bookingId,
      courtId: group.courtId,
      courtName: group.courtName,
      userName: group.userName,
      userEmail: group.userEmail,
      status: group.status as CalendarBooking["status"],
      isAdminOverride: group.isAdminOverride,
      adminNotes: group.adminNotes,
      totalCents: group.totalCents,
      currency: group.currency,
      startTime: mergedStart,
      endTime: mergedEnd,
    });
  }

  const blocks: CalendarBlock[] = (blocksResult.data || []).map((b) => ({
    id: b.id,
    courtId: b.court_id,
    courtName: (b.courts as { name: string } | null)?.name || "Unknown",
    reason: b.reason as CalendarBlock["reason"],
    description: b.description,
    startTime: b.start_time,
    endTime: b.end_time,
  }));

  return {
    courts,
    bookings,
    blocks,
    weekStart: weekStartDate,
    weekEnd: weekEndDate,
    timezone,
    orgId,
    orgSlug,
  };
}

async function CalendarContent({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const org = await getOrgBySlug(slug);
  const data = await getCalendarData(org.id, slug, org.timezone, week);

  return <CourtSheet data={data} />;
}

export default async function CalendarPage({
  params,
  searchParams,
}: CalendarPageProps) {
  const { slug } = await params;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Court Sheet</h1>
        <p className="text-gray-600">Weekly calendar view of all bookings and blocks</p>
      </div>
      <Suspense
        fallback={
          <div className="text-center py-8 text-gray-500">
            Loading calendar...
          </div>
        }
      >
        <CalendarContent slug={slug} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
