import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlockForm } from "./block-form";
import { BlockList } from "./block-list";

interface BlockCourtPageProps {
  params: Promise<{ courtId: string }>;
}

export default async function BlockCourtPage({ params }: BlockCourtPageProps) {
  const { courtId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: court } = await supabase
    .from('courts')
    .select('*')
    .eq('id', courtId)
    .single();

  if (!court) {
    notFound();
  }

  // Fetch active blocks separately (Supabase doesn't support filtered includes)
  const { data: blocks } = await supabase
    .from('court_blocks')
    .select('*')
    .eq('court_id', courtId)
    .gte('end_time', new Date().toISOString())
    .order('start_time');

  return (
    <div className="max-w-2xl space-y-6">
      <div>
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
          <BlockForm courtId={court.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Blocks</CardTitle>
        </CardHeader>
        <CardContent>
          <BlockList blocks={blocks || []} />
        </CardContent>
      </Card>
    </div>
  );
}
