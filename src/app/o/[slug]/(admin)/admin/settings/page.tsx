import { getOrgBySlug } from "@/lib/org-context";
import { requireOrgRole } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  GeneralSettingsForm,
  BookingSettingsForm,
  BrandingForm,
} from "./settings-forms";

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminSettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  const { role } = await requireOrgRole(org.id, "admin");

  const isOwner = role === "owner";

  // Fetch full org data
  const supabase = await createServerSupabaseClient();
  const { data: orgData } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", org.id)
    .single();

  if (!orgData) {
    return <p>Organization not found</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">
          Manage your organization&apos;s configuration
        </p>
      </div>

      <GeneralSettingsForm org={orgData} isOwner={isOwner} />
      <BookingSettingsForm org={orgData} />
      <BrandingForm org={orgData} />
    </div>
  );
}
