import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Check if the current user is an admin
 * When orgId is provided, checks org membership role instead of global role.
 * Returns the user if admin, null otherwise
 */
export async function getAdminUser(orgId?: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) {
    return null;
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_id', supabaseUser.id)
    .single();

  if (!user) {
    return null;
  }

  // If orgId is provided, check org membership role
  if (orgId) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    if (!membership || !['admin', 'owner'].includes(membership.role)) {
      return null;
    }

    return user;
  }

  // Fallback: check global role for backward compatibility
  if (user.role !== "ADMIN") {
    return null;
  }

  return user;
}

/**
 * Check if the current user has admin/owner role in the specified org.
 * Returns the user if they have admin or owner role, null otherwise.
 */
export async function getOrgAdmin(orgId: string) {
  return getAdminUser(orgId);
}

/**
 * Require admin access - redirects to home if not admin
 * Use this in admin pages to protect routes
 */
export async function requireAdmin() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/");
  }

  return admin;
}

/**
 * Check if a user ID is an admin (for server actions)
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  return user?.role === "ADMIN";
}
