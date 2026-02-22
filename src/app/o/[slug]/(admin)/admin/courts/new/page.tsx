import { getOrgBySlug } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourtForm } from "@/app/admin/courts/court-form";

interface NewCourtPageProps {
  params: Promise<{ slug: string }>;
}

export default async function NewCourtPage({ params }: NewCourtPageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Court</h1>
        <p className="text-gray-600">Create a new pickleball court</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Court Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CourtForm orgId={org.id} />
        </CardContent>
      </Card>
    </div>
  );
}
