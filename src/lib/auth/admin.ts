import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Check if the current user is an admin
 * Returns the user if admin, null otherwise
 */
export async function getAdminUser() {
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

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return user;
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
