import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgBySlug } from "@/lib/org-context";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BlockForm } from "@/app/admin/courts/[courtId]/block/block-form";
import { BlockList } from "@/app/admin/courts/[courtId]/block/block-list";

interface BlockCourtPageProps {
  params: Promise<{ slug: string; courtId: string }>;
}

export default async function BlockCourtPage({ params }: BlockCourtPageProps) {
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

  // Fetch active blocks for this court
  const { data: blocks } = await supabase
    .from("court_blocks")
    .select("*")
    .eq("court_id", courtId)
    .gte("end_time", new Date().toISOString())
    .order("start_time");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href={`/o/${slug}/admin/courts`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courts
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Block Court Time</h1>
        <p className="text-gray-600">
          Block time slots for {court.name} (maintenance, events, etc.)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Block</CardTitle>
        </CardHeader>
        <CardContent>
          <BlockForm courtId={court.id} orgId={org.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Blocks</CardTitle>
        </CardHeader>
        <CardContent>
          <BlockList blocks={blocks || []} orgId={org.id} />
        </CardContent>
      </Card>
    </div>
  );
}
