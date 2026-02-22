import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type OrgRole = "owner" | "admin" | "staff" | "member" | "guest";

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 100,
  admin: 80,
  staff: 60,
  member: 40,
  guest: 20,
};

export function hasMinRole(userRole: OrgRole, requiredRole: OrgRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Get user's role in an organization. Returns null if not a member.
 */
export async function getUserOrgRole(
  userId: string,
  orgId: string
): Promise<OrgRole | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .single();
  return (data?.role as OrgRole) ?? null;
}

/**
 * Server component helper: require minimum role or redirect.
 * Use in page.tsx files for admin/staff pages.
 */
export async function requireOrgRole(
  orgId: string,
  requiredRole: OrgRole
): Promise<{ userId: string; role: OrgRole }> {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createServerSupabaseClient();
  const { data: dbUser } = await supabase
    .from("users")
    .select("id")
    .eq("supabase_id", user.id)
    .single();

  if (!dbUser) redirect("/login");

  const role = await getUserOrgRole(dbUser.id, orgId);
  if (!role || !hasMinRole(role, requiredRole)) {
    redirect("/dashboard");
  }

  return { userId: dbUser.id, role };
}
