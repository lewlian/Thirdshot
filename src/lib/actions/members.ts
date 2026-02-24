"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OrgRole } from "@/lib/permissions";
import type { Json } from "@/types/database";

// Audit log helper (duplicated locally to avoid circular deps)
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
    notes: options?.notes || null,
  });
}

export const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "staff", "member", "guest"]),
  tierId: z.string().optional(),
});

/**
 * Invite a member to the organization by email.
 * If the user already exists in the system, add them directly.
 * If not, we create a pending invitation (stored as org_member with status 'invited').
 */
export async function inviteMember(orgId: string, formData: FormData) {
  const admin = await getOrgAdmin(orgId);
  if (!admin) return { error: "Unauthorized" };

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    tierId: formData.get("tierId") && formData.get("tierId") !== "none" ? formData.get("tierId") : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, role, tierId } = parsed.data;

  try {
    const supabase = await createServerSupabaseClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email, name")
      .eq("email", email)
      .single();

    if (existingUser) {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from("organization_members")
        .select("id, role")
        .eq("organization_id", orgId)
        .eq("user_id", existingUser.id)
        .single();

      if (existingMember) {
        return { error: "This user is already a member of this organization" };
      }

      // Check if org has an active waiver
      const { data: activeWaiver } = await supabase
        .from("waivers")
        .select("id")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .limit(1)
        .single();

      // Check if user already signed the waiver
      let needsWaiver = false;
      if (activeWaiver) {
        const { data: signature } = await supabase
          .from("waiver_signatures")
          .select("id")
          .eq("waiver_id", activeWaiver.id)
          .eq("user_id", existingUser.id)
          .single();
        needsWaiver = !signature;
      }

      const memberStatus = needsWaiver ? "pending_waiver" : "active";

      // Add as member
      const { error: insertError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: orgId,
          user_id: existingUser.id,
          role,
          membership_tier_id: tierId || null,
          membership_status: memberStatus,
        });

      if (insertError) throw insertError;

      await createAuditLog(admin.id, orgId, "INVITE_MEMBER", "OrganizationMember", existingUser.id, {
        newData: { email, role, tierName: tierId },
      });
    } else {
      // User doesn't exist yet — create a placeholder invite
      // For now, we'll store email in notes. In a full system, we'd have an invitations table.
      // We create the membership when the user signs up and gets matched by email.
      // For MVP, show a message that the user needs to sign up first.
      return {
        error: `No account found for ${email}. The user needs to sign up first, then you can add them.`,
      };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to invite member:", error);
    return { error: "Failed to invite member" };
  }
}

/**
 * Update a member's role in the organization.
 */
export async function updateMemberRole(
  orgId: string,
  memberId: string,
  newRole: OrgRole
) {
  const admin = await getOrgAdmin(orgId);
  if (!admin) return { error: "Unauthorized" };

  // Validate role
  const validRoles: OrgRole[] = ["owner", "admin", "staff", "member", "guest"];
  if (!validRoles.includes(newRole)) {
    return { error: "Invalid role" };
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Get current member info
    const { data: member } = await supabase
      .from("organization_members")
      .select("id, user_id, role")
      .eq("id", memberId)
      .eq("organization_id", orgId)
      .single();

    if (!member) return { error: "Member not found" };

    // Prevent demoting yourself
    if (member.user_id === admin.id && newRole !== "owner" && newRole !== "admin") {
      return { error: "Cannot demote your own role" };
    }

    // Only owners can assign owner/admin roles
    const { data: adminMembership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", admin.id)
      .single();

    if (
      (newRole === "owner" || newRole === "admin") &&
      adminMembership?.role !== "owner"
    ) {
      return { error: "Only owners can assign admin or owner roles" };
    }

    const previousRole = member.role;

    const { error: updateError } = await supabase
      .from("organization_members")
      .update({ role: newRole })
      .eq("id", memberId)
      .eq("organization_id", orgId);

    if (updateError) throw updateError;

    await createAuditLog(admin.id, orgId, "UPDATE_ROLE", "OrganizationMember", memberId, {
      previousData: { role: previousRole },
      newData: { role: newRole },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update member role:", error);
    return { error: "Failed to update role" };
  }
}

/**
 * Update a member's membership tier.
 */
export async function updateMemberTier(
  orgId: string,
  memberId: string,
  tierId: string | null
) {
  const admin = await getOrgAdmin(orgId);
  if (!admin) return { error: "Unauthorized" };

  try {
    const supabase = await createServerSupabaseClient();

    // Verify tier belongs to this org (if not null)
    if (tierId) {
      const { data: tier } = await supabase
        .from("membership_tiers")
        .select("id")
        .eq("id", tierId)
        .eq("organization_id", orgId)
        .single();

      if (!tier) return { error: "Invalid membership tier" };
    }

    const { data: member } = await supabase
      .from("organization_members")
      .select("id, membership_tier_id")
      .eq("id", memberId)
      .eq("organization_id", orgId)
      .single();

    if (!member) return { error: "Member not found" };

    const { error: updateError } = await supabase
      .from("organization_members")
      .update({
        membership_tier_id: tierId,
        membership_start_date: tierId ? new Date().toISOString() : null,
      })
      .eq("id", memberId)
      .eq("organization_id", orgId);

    if (updateError) throw updateError;

    await createAuditLog(admin.id, orgId, "UPDATE_TIER", "OrganizationMember", memberId, {
      previousData: { tierId: member.membership_tier_id },
      newData: { tierId },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update member tier:", error);
    return { error: "Failed to update membership tier" };
  }
}

/**
 * Suspend a member (set membership_status to 'suspended').
 */
export async function suspendMember(orgId: string, memberId: string) {
  const admin = await getOrgAdmin(orgId);
  if (!admin) return { error: "Unauthorized" };

  try {
    const supabase = await createServerSupabaseClient();

    const { data: member } = await supabase
      .from("organization_members")
      .select("id, user_id, role, membership_status")
      .eq("id", memberId)
      .eq("organization_id", orgId)
      .single();

    if (!member) return { error: "Member not found" };

    // Cannot suspend owners
    if (member.role === "owner") {
      return { error: "Cannot suspend an owner" };
    }

    // Cannot suspend yourself
    if (member.user_id === admin.id) {
      return { error: "Cannot suspend yourself" };
    }

    const { error: updateError } = await supabase
      .from("organization_members")
      .update({ membership_status: "suspended" })
      .eq("id", memberId)
      .eq("organization_id", orgId);

    if (updateError) throw updateError;

    await createAuditLog(admin.id, orgId, "SUSPEND_MEMBER", "OrganizationMember", memberId, {
      previousData: { status: member.membership_status },
      newData: { status: "suspended" },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to suspend member:", error);
    return { error: "Failed to suspend member" };
  }
}

/**
 * Activate (unsuspend) a member.
 */
export async function activateMember(orgId: string, memberId: string) {
  const admin = await getOrgAdmin(orgId);
  if (!admin) return { error: "Unauthorized" };

  try {
    const supabase = await createServerSupabaseClient();

    const { data: member } = await supabase
      .from("organization_members")
      .select("id, membership_status")
      .eq("id", memberId)
      .eq("organization_id", orgId)
      .single();

    if (!member) return { error: "Member not found" };

    const { error: updateError } = await supabase
      .from("organization_members")
      .update({ membership_status: "active" })
      .eq("id", memberId)
      .eq("organization_id", orgId);

    if (updateError) throw updateError;

    await createAuditLog(admin.id, orgId, "ACTIVATE_MEMBER", "OrganizationMember", memberId, {
      previousData: { status: member.membership_status },
      newData: { status: "active" },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to activate member:", error);
    return { error: "Failed to activate member" };
  }
}

/**
 * Remove a member from the organization entirely.
 */
export async function removeMember(orgId: string, memberId: string) {
  const admin = await getOrgAdmin(orgId);
  if (!admin) return { error: "Unauthorized" };

  try {
    const supabase = await createServerSupabaseClient();

    const { data: member } = await supabase
      .from("organization_members")
      .select("id, user_id, role")
      .eq("id", memberId)
      .eq("organization_id", orgId)
      .single();

    if (!member) return { error: "Member not found" };

    // Cannot remove owners
    if (member.role === "owner") {
      return { error: "Cannot remove an owner" };
    }

    // Cannot remove yourself
    if (member.user_id === admin.id) {
      return { error: "Cannot remove yourself" };
    }

    const { error: deleteError } = await supabase
      .from("organization_members")
      .delete()
      .eq("id", memberId)
      .eq("organization_id", orgId);

    if (deleteError) throw deleteError;

    await createAuditLog(admin.id, orgId, "REMOVE_MEMBER", "OrganizationMember", memberId, {
      previousData: { role: member.role, userId: member.user_id },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove member:", error);
    return { error: "Failed to remove member" };
  }
}
