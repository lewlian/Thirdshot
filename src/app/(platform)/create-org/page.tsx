import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { CreateOrgWizard } from "./create-org-wizard";

export default async function CreateOrgPage() {
  const user = await getUser();
  if (!user) redirect("/signup?redirect=/create-org");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <CreateOrgWizard />
      </div>
    </div>
  );
}
