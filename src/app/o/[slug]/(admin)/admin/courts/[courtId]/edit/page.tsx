import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgBySlug } from "@/lib/org-context";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourtForm } from "@/app/admin/courts/court-form";

interface EditCourtPageProps {
  params: Promise<{ slug: string; courtId: string }>;
}

export default async function EditCourtPage({ params }: EditCourtPageProps) {
  const { slug, courtId } = await params;
  const org = await getOrgBySlug(slug);
  const supabase = await createServerSupabaseClient();

  const { data: court } = await supabase
    .from("courts")
    .select("*")
    .eq("id", courtId)
    .eq("organization_id", org.id)
    .single();

  if (!court) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Court</h1>
        <p className="text-gray-600">Update court details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Court Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CourtForm court={court} orgId={org.id} linkPrefix={`/o/${slug}`} />
        </CardContent>
      </Card>
    </div>
  );
}
