import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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

  const user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  });

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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === "ADMIN";
}
