import { redirect } from "next/navigation";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";
import { CreateOrgWizard } from "./create-org-wizard";

export default async function CreateOrgPage() {
  const user = await getUser();
  if (!user) redirect("/signup?redirect=/create-org");

  // Only platform super admins can create organizations
  const supabase = await createServerSupabaseClient();
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("supabase_id", user.id)
    .single();

  if (!dbUser || dbUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <CreateOrgWizard />
      </div>
    </div>
  );
}
