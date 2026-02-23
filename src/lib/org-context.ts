import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export interface OrgContext {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  timezone: string;
  currency: string;
  booking_window_days: number;
  slot_duration_minutes: number;
  max_consecutive_slots: number;
  payment_timeout_minutes: number;
  allow_guest_bookings: boolean;
  primary_color: string;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  payment_provider: string;
  plan: string;
}

/**
 * Resolve organization from URL slug. Cached per-request with React cache().
 * Returns org data or calls notFound() if slug doesn't exist.
 */
export const getOrgBySlug = cache(async (slug: string): Promise<OrgContext> => {
  const supabase = await createServerSupabaseClient();
  const { data: org, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!org || error) {
    notFound();
  }

  return org as OrgContext;
});

/**
 * Get all orgs a user belongs to. Used in /dashboard.
 */
export async function getUserOrgs(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("user_id", userId);
  return data || [];
}

/**
 * Get user's membership in a specific org.
 */
export async function getOrgMembership(userId: string, orgId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("organization_members")
    .select("*, membership_tiers(*)")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .single();
  return data;
}

/**
 * Get the current authenticated user's database record. Cached per-request.
 */
export const getCurrentDbUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) return null;

  const { data: dbUser } = await supabase
    .from("users")
    .select("*")
    .eq("supabase_id", supabaseUser.id)
    .single();

  return dbUser;
});
