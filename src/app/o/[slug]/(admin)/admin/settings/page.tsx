import { getOrgBySlug } from "@/lib/org-context";
import { requireOrgRole } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  GeneralSettingsForm,
  BookingSettingsForm,
  BrandingForm,
  ClubPageForm,
  WaiverSettingsForm,
} from "./settings-forms";
import { getActiveWaiver } from "@/lib/actions/waivers";

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

  // Fetch waiver data
  const waiver = await getActiveWaiver(org.id);
  let signatureCount = 0;
  if (waiver) {
    const { count } = await supabase
      .from("waiver_signatures")
      .select("*", { count: "exact", head: true })
      .eq("waiver_id", waiver.id);
    signatureCount = count || 0;
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
      <ClubPageForm org={orgData} />
      <WaiverSettingsForm org={orgData} waiver={waiver} signatureCount={signatureCount} />
    </div>
  );
}
