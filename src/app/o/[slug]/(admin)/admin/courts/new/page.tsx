import Link from "next/link";
import { getOrgBySlug } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href={`/o/${slug}/admin/courts`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courts
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Add New Court</h1>
        <p className="text-gray-600">Create a new pickleball court</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Court Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CourtForm orgId={org.id} linkPrefix={`/o/${slug}`} currency={org.currency} />
        </CardContent>
      </Card>
    </div>
  );
}
