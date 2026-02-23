"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
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

export const orgSettingsSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  timezone: z.string().min(1),
  currency: z.string().min(3).max(3),
});

export const bookingSettingsSchema = z.object({
  booking_window_days: z.number().min(1).max(90),
  slot_duration_minutes: z.number().min(15).max(120),
  max_consecutive_slots: z.number().min(1).max(8),
  payment_timeout_minutes: z.number().min(5).max(60),
  allow_guest_bookings: z.boolean(),
});

/**
 * Update organization general settings. Owner-only.
 */
export async function updateOrgSettings(orgId: string, formData: FormData) {
  const { userId } = await requireOrgRole(orgId, "owner");

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    email: (formData.get("email") as string) || "",
    phone: (formData.get("phone") as string) || "",
    website: (formData.get("website") as string) || "",
    address: (formData.get("address") as string) || "",
    city: (formData.get("city") as string) || "",
    timezone: formData.get("timezone") as string,
    currency: formData.get("currency") as string,
  };

  const parsed = orgSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Get current org for audit log
    const { data: currentOrg } = await supabase
      .from("organizations")
      .select("name, description, email, phone, website, address, city, timezone, currency")
      .eq("id", orgId)
      .single();

    const { error } = await supabase
      .from("organizations")
      .update({
        name: parsed.data.name,
        description: parsed.data.description || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        website: parsed.data.website || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        timezone: parsed.data.timezone,
        currency: parsed.data.currency,
      })
      .eq("id", orgId);

    if (error) throw error;

    await createAuditLog(userId, orgId, "UPDATE", "Organization", orgId, {
      previousData: currentOrg as unknown as Record<string, unknown>,
      newData: parsed.data as unknown as Record<string, unknown>,
    });

    revalidatePath(`/admin/settings`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update org settings:", error);
    return { error: "Failed to update settings" };
  }
}

/**
 * Update organization booking settings. Admin or owner.
 */
export async function updateBookingSettings(orgId: string, formData: FormData) {
  const { userId } = await requireOrgRole(orgId, "admin");

  const raw = {
    booking_window_days: parseInt(formData.get("booking_window_days") as string),
    slot_duration_minutes: parseInt(formData.get("slot_duration_minutes") as string),
    max_consecutive_slots: parseInt(formData.get("max_consecutive_slots") as string),
    payment_timeout_minutes: parseInt(formData.get("payment_timeout_minutes") as string),
    allow_guest_bookings: formData.get("allow_guest_bookings") === "true",
  };

  const parsed = bookingSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { data: currentOrg } = await supabase
      .from("organizations")
      .select("booking_window_days, slot_duration_minutes, max_consecutive_slots, payment_timeout_minutes, allow_guest_bookings")
      .eq("id", orgId)
      .single();

    const { error } = await supabase
      .from("organizations")
      .update(parsed.data)
      .eq("id", orgId);

    if (error) throw error;

    await createAuditLog(userId, orgId, "UPDATE_BOOKING_SETTINGS", "Organization", orgId, {
      previousData: currentOrg as unknown as Record<string, unknown>,
      newData: parsed.data as unknown as Record<string, unknown>,
    });

    revalidatePath(`/admin/settings`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update booking settings:", error);
    return { error: "Failed to update booking settings" };
  }
}

/**
 * Update club page settings (hero image, tagline, operating hours). Admin or owner.
 */
export async function updateClubPage(orgId: string, formData: FormData) {
  const { userId } = await requireOrgRole(orgId, "admin");

  const heroImageUrl = (formData.get("hero_image_url") as string) || "";
  const tagline = (formData.get("tagline") as string) || "";

  // Parse operating hours from form
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const operatingHours: Record<string, string> = {};
  for (const day of days) {
    operatingHours[day] = (formData.get(`hours_${day}`) as string) || "07:00-22:00";
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from("organizations")
      .update({
        hero_image_url: heroImageUrl || null,
        tagline: tagline || null,
        operating_hours: operatingHours,
      })
      .eq("id", orgId);

    if (error) throw error;

    await createAuditLog(userId, orgId, "UPDATE_CLUB_PAGE", "Organization", orgId, {
      newData: { hero_image_url: heroImageUrl, tagline, operating_hours: operatingHours },
    });

    revalidatePath(`/admin/settings`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update club page:", error);
    return { error: "Failed to update club page settings" };
  }
}

/**
 * Update organization branding (primary color). Admin or owner.
 */
export async function updateBranding(orgId: string, formData: FormData) {
  const { userId } = await requireOrgRole(orgId, "admin");

  const primaryColor = formData.get("primary_color") as string;

  if (!primaryColor || !/^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
    return { error: "Invalid color format" };
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from("organizations")
      .update({ primary_color: primaryColor })
      .eq("id", orgId);

    if (error) throw error;

    await createAuditLog(userId, orgId, "UPDATE_BRANDING", "Organization", orgId, {
      newData: { primary_color: primaryColor },
    });

    revalidatePath(`/admin/settings`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update branding:", error);
    return { error: "Failed to update branding" };
  }
}
