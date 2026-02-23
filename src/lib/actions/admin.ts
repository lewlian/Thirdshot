"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Json } from "@/types/database";

// Court schemas
const courtSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  pricePerHourCents: z.number().min(0, "Price must be positive"),
  isActive: z.boolean().default(true),
});

const courtBlockSchema = z.object({
  courtId: z.string().min(1, "Court ID is required"),
  startTime: z.date(),
  endTime: z.date(),
  reason: z.enum(["MAINTENANCE", "TOURNAMENT", "PRIVATE_EVENT", "OTHER"]),
});

// Create audit log entry
async function createAuditLog(
  adminId: string,
  orgId: string,
  action: string,
  entityType: string,
  entityId: string,
  options?: {
    previousData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    notes?: string;
  }
) {
  const supabase = await createServerSupabaseClient();

  await supabase
    .from('admin_audit_logs')
    .insert({
      id: crypto.randomUUID(),
      admin_id: adminId,
      organization_id: orgId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      previous_data: options?.previousData ? (options.previousData as Json) : undefined,
      new_data: options?.newData ? (options.newData as Json) : undefined,
      notes: options?.notes || null,
    });
}

// Court CRUD operations
export async function createCourt(formData: FormData) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const orgId = formData.get("orgId") as string;
  if (!orgId) {
    return { success: false, error: "Organization ID is required" };
  }

  const data = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    pricePerHourCents: Math.round(
      parseFloat(formData.get("pricePerHour") as string) * 100
    ),
    isActive: formData.get("isActive") === "true",
  };

  const parsed = courtSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const supabase = await createServerSupabaseClient();

    const openTime = (formData.get("openTime") as string) || "07:00";
    const closeTime = (formData.get("closeTime") as string) || "22:00";
    const slotDuration = parseInt((formData.get("slotDuration") as string) || "60", 10);

    const { data: court, error } = await supabase
      .from('courts')
      .insert({
        id: crypto.randomUUID(),
        name: parsed.data.name,
        description: parsed.data.description,
        price_per_hour_cents: parsed.data.pricePerHourCents,
        is_active: parsed.data.isActive,
        organization_id: orgId,
        open_time: openTime,
        close_time: closeTime,
        slot_duration_minutes: slotDuration,
      })
      .select()
      .single();

    if (error) throw error;

    await createAuditLog(admin.id, orgId, "CREATE", "Court", court.id, {
      newData: { name: court.name },
    });

    revalidatePath("/admin/courts");
    revalidatePath("/book");

    return { success: true, court };
  } catch (error) {
    console.error("Failed to create court:", error);
    return { success: false, error: "Failed to create court" };
  }
}

export async function updateCourt(courtId: string, formData: FormData) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const orgId = formData.get("orgId") as string;
  if (!orgId) {
    return { success: false, error: "Organization ID is required" };
  }

  const data = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    pricePerHourCents: Math.round(
      parseFloat(formData.get("pricePerHour") as string) * 100
    ),
    isActive: formData.get("isActive") === "true",
  };

  const parsed = courtSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const supabase = await createServerSupabaseClient();

    const openTime = formData.get("openTime") as string;
    const closeTime = formData.get("closeTime") as string;
    const slotDuration = formData.get("slotDuration") as string;

    const updateData: Record<string, unknown> = {
      name: parsed.data.name,
      description: parsed.data.description,
      price_per_hour_cents: parsed.data.pricePerHourCents,
      is_active: parsed.data.isActive,
    };
    if (openTime) updateData.open_time = openTime;
    if (closeTime) updateData.close_time = closeTime;
    if (slotDuration) updateData.slot_duration_minutes = parseInt(slotDuration, 10);

    const { data: court, error } = await supabase
      .from('courts')
      .update(updateData)
      .eq('id', courtId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog(admin.id, orgId, "UPDATE", "Court", court.id, {
      newData: { name: court.name, changes: data },
    });

    revalidatePath("/admin/courts");
    revalidatePath("/book");

    return { success: true, court };
  } catch (error) {
    console.error("Failed to update court:", error);
    return { success: false, error: "Failed to update court" };
  }
}

export async function deleteCourt(courtId: string, orgId: string) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Check for existing bookings by querying booking slots with inner join
    const { count: bookingSlotsCount } = await supabase
      .from('booking_slots')
      .select('*, bookings!inner(status)', { count: 'exact', head: true })
      .eq('court_id', courtId)
      .in('bookings.status', ['CONFIRMED', 'PENDING_PAYMENT']);

    if (bookingSlotsCount && bookingSlotsCount > 0) {
      return {
        success: false,
        error: `Cannot delete court with ${bookingSlotsCount} active booking slots. Deactivate it instead.`,
      };
    }

    const { data: court, error } = await supabase
      .from('courts')
      .delete()
      .eq('id', courtId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog(admin.id, orgId, "DELETE", "Court", courtId, {
      previousData: { name: court.name },
    });

    revalidatePath("/admin/courts");
    revalidatePath("/book");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete court:", error);
    return { success: false, error: "Failed to delete court" };
  }
}

// Court blocking
export async function createCourtBlock(formData: FormData) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const orgId = formData.get("orgId") as string;
  if (!orgId) {
    return { success: false, error: "Organization ID is required" };
  }

  const data = {
    courtId: formData.get("courtId") as string,
    startTime: new Date(formData.get("startTime") as string),
    endTime: new Date(formData.get("endTime") as string),
    reason: (formData.get("reason") as string) || "OTHER",
  };

  const parsed = courtBlockSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  if (parsed.data.startTime >= parsed.data.endTime) {
    return { success: false, error: "End time must be after start time" };
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Check for conflicting booking slots
    const { data: conflictingSlots } = await supabase
      .from('booking_slots')
      .select('*, bookings!inner(status)')
      .eq('court_id', parsed.data.courtId)
      .lt('start_time', parsed.data.endTime.toISOString())
      .gt('end_time', parsed.data.startTime.toISOString())
      .eq('bookings.status', 'CONFIRMED')
      .limit(1);

    if (conflictingSlots && conflictingSlots.length > 0) {
      return {
        success: false,
        error: "There are existing bookings during this time period",
      };
    }

    const { data: block, error } = await supabase
      .from('court_blocks')
      .insert({
        id: crypto.randomUUID(),
        court_id: parsed.data.courtId,
        start_time: parsed.data.startTime.toISOString(),
        end_time: parsed.data.endTime.toISOString(),
        reason: parsed.data.reason,
        created_by_id: admin.id,
        organization_id: orgId,
      })
      .select()
      .single();

    if (error) throw error;

    await createAuditLog(admin.id, orgId, "CREATE", "CourtBlock", block.id, {
      newData: {
        courtId: parsed.data.courtId,
        startTime: parsed.data.startTime.toISOString(),
        endTime: parsed.data.endTime.toISOString(),
        reason: parsed.data.reason,
      },
    });

    revalidatePath("/admin/courts");
    revalidatePath("/book");

    return { success: true, block };
  } catch (error) {
    console.error("Failed to create court block:", error);
    return { success: false, error: "Failed to create court block" };
  }
}

export async function deleteCourtBlock(blockId: string, orgId: string) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { data: block, error } = await supabase
      .from('court_blocks')
      .delete()
      .eq('id', blockId)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog(admin.id, orgId, "DELETE", "CourtBlock", blockId, {
      previousData: { courtId: block.court_id },
    });

    revalidatePath("/admin/courts");
    revalidatePath("/book");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete court block:", error);
    return { success: false, error: "Failed to delete court block" };
  }
}

// Admin booking management
export async function adminCancelBooking(bookingId: string, reason?: string, orgId?: string) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { data: booking, error } = await supabase
      .from('bookings')
      .update({
        status: "CANCELLED",
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
      })
      .eq('id', bookingId)
      .select('*, users(*), booking_slots(*, courts(*))')
      .single();

    if (error) throw error;

    const resolvedOrgId = orgId || booking.organization_id;
    await createAuditLog(admin.id, resolvedOrgId, "CANCEL", "Booking", bookingId, {
      newData: {
        reason,
        userId: booking.user_id,
        slotCount: booking.booking_slots.length,
      },
    });

    revalidatePath("/admin/bookings");

    return { success: true, booking };
  } catch (error) {
    console.error("Failed to cancel booking:", error);
    return { success: false, error: "Failed to cancel booking" };
  }
}

// User management
export async function updateUserRole(
  userId: string,
  role: "USER" | "ADMIN",
  orgId: string
) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  // Prevent removing own admin access
  if (userId === admin.id && role === "USER") {
    return { success: false, error: "Cannot remove your own admin access" };
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { data: user, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog(admin.id, orgId, "UPDATE_ROLE", "User", userId, {
      newData: { newRole: role },
    });

    revalidatePath("/admin/users");

    return { success: true, user };
  } catch (error) {
    console.error("Failed to update user role:", error);
    return { success: false, error: "Failed to update user role" };
  }
}
