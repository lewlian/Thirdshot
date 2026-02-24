import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgBySlug } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface AdminCourtsPageProps {
  params: Promise<{ slug: string }>;
}

async function getCourts(organizationId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("courts")
    .select("*, booking_slots(count)")
    .eq("organization_id", organizationId)
    .order("name");
  return data || [];
}

export default async function AdminCourtsPage({
  params,
}: AdminCourtsPageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  const courts = await getCourts(org.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courts</h1>
          <p className="text-gray-600">Manage your pickleball courts</p>
        </div>
        <Link href={`/o/${slug}/admin/courts/new`}>
          <Button>Add Court</Button>
        </Link>
      </div>

      {courts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No courts created yet</p>
            <Link href={`/o/${slug}/admin/courts/new`}>
              <Button>Create your first court</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {courts.map((court) => (
            <Card key={court.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {court.name}
                      {!court.is_active && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </CardTitle>
                    {court.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {court.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/o/${slug}/admin/courts/${court.id}/block`}>
                      <Button variant="outline" size="sm">
                        Block Time
                      </Button>
                    </Link>
                    <Link href={`/o/${slug}/admin/courts/${court.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Price:</span>{" "}
                    <span className="font-medium">
                      {formatCurrency(court.price_per_hour_cents, org.currency)}/hr
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Booked Slots:</span>{" "}
                    <span className="font-medium">
                      {(
                        court.booking_slots as unknown as { count: number }[]
                      )?.[0]?.count ?? 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
