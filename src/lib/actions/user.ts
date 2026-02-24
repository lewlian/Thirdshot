"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/server";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().max(20).optional().nullable(),
});

export type ProfileActionResult = {
  error?: string;
  success?: boolean;
};

export async function updateProfile(
  formData: FormData
): Promise<ProfileActionResult> {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const supabase = await createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_id', user.id)
    .single();

  if (!dbUser) {
    return { error: "User not found" };
  }

  const rawData = {
    name: formData.get("name") as string,
    phone: (formData.get("phone") as string) || null,
  };

  const parsed = updateProfileSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await supabase
    .from('users')
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone,
    })
    .eq('id', dbUser.id);

  revalidatePath("/", "layout");
  return { success: true };
}

export async function getProfileStats(orgId: string) {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const supabase = await createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_id', user.id)
    .single();

  if (!dbUser) {
    return null;
  }

  // Use RPC for complex count queries with relation filters
  const { data: stats } = await supabase.rpc('get_profile_stats', {
    p_user_id: dbUser.id,
    p_organization_id: orgId,
  });

  if (!stats) {
    return {
      totalBookings: 0,
      upcomingBookings: 0,
      completedBookings: 0,
    };
  }

  return {
    totalBookings: (stats as any).totalBookings || 0,
    upcomingBookings: (stats as any).upcomingBookings || 0,
    completedBookings: (stats as any).completedBookings || 0,
  };
}
