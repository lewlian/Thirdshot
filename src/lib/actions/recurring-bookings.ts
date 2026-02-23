"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDays, format, getDay, parseISO } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import type { Json } from "@/types/database";

// Audit log helper
async function createAuditLog(
  adminId: string,
  orgId: string,
  action: string,
  entityType: string,
  entityId: string,
  options?: {
    previousData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
  }
) {
  const supabase = await createServerSupabaseClient();
  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    organization_id: orgId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    previous_data: options?.previousData
      ? (options.previousData as Json)
      : undefined,
    new_data: options?.newData ? (options.newData as Json) : undefined,
    notes: null,
  });
}

const createRecurringSchema = z.object({
  courtId: z.string().min(1, "Court is required"),
  title: z.string().min(1, "Title is required").max(200),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  startsOn: z.string().min(1, "Start date is required"),
  endsOn: z.string().min(1, "End date is required"),
  notes: z.string().max(500).optional(),
});

/**
 * Create a recurring booking and generate all individual bookings.
 * Admin only.
 */
export async function createRecurringBooking(orgId: string, formData: FormData) {
  const { userId } = await requireOrgRole(orgId, "admin");

  const raw = {
    courtId: formData.get("courtId") as string,
    title: formData.get("title") as string,
    dayOfWeek: parseInt(formData.get("dayOfWeek") as string),
    startTime: formData.get("startTime") as string,
    endTime: formData.get("endTime") as string,
    startsOn: formData.get("startsOn") as string,
    endsOn: formData.get("endsOn") as string,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = createRecurringSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { courtId, title, dayOfWeek, startTime, endTime, startsOn, endsOn, notes } = parsed.data;

  // Validate date range
  const startDate = parseISO(startsOn);
  const endDate = parseISO(endsOn);
  if (endDate <= startDate) {
    return { error: "End date must be after start date" };
  }

  // Validate time range
  if (endTime <= startTime) {
    return { error: "End time must be after start time" };
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Verify court belongs to org
    const { data: court } = await supabase
      .from("courts")
      .select("id, name, organization_id")
      .eq("id", courtId)
      .eq("organization_id", orgId)
      .single();

    if (!court) return { error: "Court not found" };

    // Get org timezone
    const { data: org } = await supabase
      .from("organizations")
      .select("timezone")
      .eq("id", orgId)
      .single();

    const timezone = org?.timezone || "Asia/Singapore";

    // Create recurring booking record
    const recurringId = crypto.randomUUID();
    const { error: recurringError } = await supabase
      .from("recurring_bookings")
      .insert({
        id: recurringId,
        organization_id: orgId,
        created_by_id: userId,
        court_id: courtId,
        title,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        starts_on: startsOn,
        ends_on: endsOn,
        frequency: "weekly",
        notes: notes || null,
        is_active: true,
      });

    if (recurringError) throw recurringError;

    // Generate dates for the recurring pattern
    const dates: Date[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      if (getDay(current) === dayOfWeek) {
        dates.push(new Date(current));
      }
      current = addDays(current, 1);
    }

    // Create individual bookings for each date
    let createdCount = 0;
    let skippedCount = 0;

    for (const date of dates) {
      const dateStr = format(date, "yyyy-MM-dd");

      // Parse times as local timezone
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);

      const localStart = new Date(date);
      localStart.setHours(startH, startM, 0, 0);
      const localEnd = new Date(date);
      localEnd.setHours(endH, endM, 0, 0);

      const slotStart = fromZonedTime(localStart, timezone);
      const slotEnd = fromZonedTime(localEnd, timezone);

      // Check for conflicts
      const { data: conflicts } = await supabase
        .from("booking_slots")
        .select("id, bookings!inner(status)")
        .eq("court_id", courtId)
        .lt("start_time", slotEnd.toISOString())
        .gt("end_time", slotStart.toISOString())
        .in("bookings.status", ["CONFIRMED", "PENDING_PAYMENT"]);

      if (conflicts && conflicts.length > 0) {
        skippedCount++;
        continue;
      }

      // Create booking and slot directly (admin override, no payment needed)
      const bookingId = crypto.randomUUID();
      const { error: bookingError } = await supabase.from("bookings").insert({
        id: bookingId,
        user_id: userId,
        organization_id: orgId,
        type: "COURT_BOOKING",
        status: "CONFIRMED",
        total_cents: 0,
        currency: "SGD",
        recurring_booking_id: recurringId,
        is_admin_override: true,
      });

      if (bookingError) {
        skippedCount++;
        continue;
      }

      const { error: slotError } = await supabase.from("booking_slots").insert({
        id: crypto.randomUUID(),
        organization_id: orgId,
        booking_id: bookingId,
        court_id: courtId,
        start_time: slotStart.toISOString(),
        end_time: slotEnd.toISOString(),
        price_in_cents: 0,
      });

      if (slotError) {
        // Clean up the booking
        await supabase.from("bookings").delete().eq("id", bookingId);
        skippedCount++;
        continue;
      }

      createdCount++;
    }

    await createAuditLog(userId, orgId, "CREATE_RECURRING_BOOKING", "RecurringBooking", recurringId, {
      newData: { title, courtId, dayOfWeek, startTime, endTime, startsOn, endsOn, createdCount, skippedCount },
    });

    revalidatePath(`/admin/bookings`);

    if (skippedCount > 0) {
      return {
        success: true,
        message: `Created ${createdCount} bookings. ${skippedCount} skipped due to conflicts.`,
      };
    }

    return { success: true, message: `Created ${createdCount} bookings.` };
  } catch (error) {
    console.error("Failed to create recurring booking:", error);
    return { error: "Failed to create recurring booking" };
  }
}

/**
 * Cancel a recurring booking and all future instances.
 * Admin only.
 */
export async function cancelRecurringBooking(orgId: string, recurringBookingId: string) {
  const { userId } = await requireOrgRole(orgId, "admin");

  try {
    const supabase = await createServerSupabaseClient();

    // Verify recurring booking belongs to org
    const { data: recurring } = await supabase
      .from("recurring_bookings")
      .select("id, title")
      .eq("id", recurringBookingId)
      .eq("organization_id", orgId)
      .single();

    if (!recurring) return { error: "Recurring booking not found" };

    // Deactivate the recurring booking
    await supabase
      .from("recurring_bookings")
      .update({ is_active: false })
      .eq("id", recurringBookingId);

    // Cancel all future bookings in this series
    const now = new Date().toISOString();
    const { data: futureBookings } = await supabase
      .from("bookings")
      .select("id, booking_slots(start_time)")
      .eq("recurring_booking_id", recurringBookingId)
      .eq("status", "CONFIRMED");

    let cancelledCount = 0;
    if (futureBookings) {
      for (const booking of futureBookings) {
        const slots = booking.booking_slots || [];
        const isFuture = slots.some(
          (s: { start_time: string }) => s.start_time > now
        );
        if (isFuture) {
          await supabase
            .from("bookings")
            .update({
              status: "CANCELLED",
              cancelled_at: now,
              cancel_reason: "Recurring booking cancelled by admin",
            })
            .eq("id", booking.id);
          cancelledCount++;
        }
      }
    }

    await createAuditLog(userId, orgId, "CANCEL_RECURRING_BOOKING", "RecurringBooking", recurringBookingId, {
      newData: { cancelledCount },
    });

    revalidatePath(`/admin/bookings`);
    return { success: true, message: `Cancelled ${cancelledCount} future bookings.` };
  } catch (error) {
    console.error("Failed to cancel recurring booking:", error);
    return { error: "Failed to cancel recurring booking" };
  }
}

/**
 * Get all recurring bookings for an organization.
 * Admin only.
 */
export async function getRecurringBookings(orgId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("recurring_bookings")
    .select("*, courts(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return data || [];
}
