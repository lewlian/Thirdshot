"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions";
import { getUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

/**
 * Get the active waiver for an organization.
 */
export async function getActiveWaiver(orgId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("waivers")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();
  return data;
}

/**
 * Check if a user has signed the current active waiver.
 */
export async function getUserWaiverStatus(orgId: string, userId: string) {
  const waiver = await getActiveWaiver(orgId);
  if (!waiver) return { required: false, signed: false, waiver: null };

  const supabase = await createServerSupabaseClient();
  const { data: signature } = await supabase
    .from("waiver_signatures")
    .select("id")
    .eq("waiver_id", waiver.id)
    .eq("user_id", userId)
    .single();

  return {
    required: true,
    signed: !!signature,
    waiver,
  };
}

/**
 * Sign a waiver. Called by the member from the sign-waiver page.
 */
export async function signWaiver(orgId: string, waiverId: string) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from("users")
    .select("id")
    .eq("supabase_id", user.id)
    .single();

  if (!dbUser) redirect("/login");

  // Verify waiver exists and belongs to org
  const { data: waiver } = await supabase
    .from("waivers")
    .select("id")
    .eq("id", waiverId)
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .single();

  if (!waiver) return { error: "Waiver not found" };

  // Check if already signed
  const { data: existing } = await supabase
    .from("waiver_signatures")
    .select("id")
    .eq("waiver_id", waiverId)
    .eq("user_id", dbUser.id)
    .single();

  if (existing) return { success: true };

  // Create signature
  const { error } = await supabase.from("waiver_signatures").insert({
    id: crypto.randomUUID(),
    organization_id: orgId,
    waiver_id: waiverId,
    user_id: dbUser.id,
  });

  if (error) {
    console.error("Failed to sign waiver:", error);
    return { error: "Failed to sign waiver" };
  }

  // Update member status to active if it was pending_waiver
  await supabase
    .from("organization_members")
    .update({ membership_status: "active" })
    .eq("organization_id", orgId)
    .eq("user_id", dbUser.id)
    .eq("membership_status", "pending_waiver");

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Update or create the waiver for an organization. Admin only.
 */
export async function updateWaiver(orgId: string, formData: FormData) {
  const { userId } = await requireOrgRole(orgId, "admin");

  const title = (formData.get("title") as string) || "Liability Waiver";
  const content = formData.get("content") as string;
  const isActive = formData.get("is_active") === "true";

  if (!content || content.trim().length < 10) {
    return { error: "Waiver content must be at least 10 characters" };
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Check for existing waiver
    const { data: existing } = await supabase
      .from("waivers")
      .select("id, version")
      .eq("organization_id", orgId)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      // Update existing waiver (increment version)
      const newVersion = existing.version + 1;
      const { error } = await supabase
        .from("waivers")
        .update({
          title,
          content,
          version: newVersion,
          is_active: isActive,
        })
        .eq("id", existing.id);

      if (error) throw error;

      await createAuditLog(userId, orgId, "UPDATE_WAIVER", "Waiver", existing.id, {
        newData: { title, version: newVersion, is_active: isActive },
      });
    } else {
      // Create new waiver
      const waiverId = crypto.randomUUID();
      const { error } = await supabase.from("waivers").insert({
        id: waiverId,
        organization_id: orgId,
        title,
        content,
        version: 1,
        is_active: isActive,
      });

      if (error) throw error;

      await createAuditLog(userId, orgId, "CREATE_WAIVER", "Waiver", waiverId, {
        newData: { title, is_active: isActive },
      });
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update waiver:", error);
    return { error: "Failed to update waiver" };
  }
}
