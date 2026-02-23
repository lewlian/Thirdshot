import { Suspense } from "react";
import Link from "next/link";
import { getOrgBySlug } from "@/lib/org-context";
import { requireOrgRole } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRecurringBookings } from "@/lib/actions/recurring-bookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { RecurringBookingForm, CancelRecurringButton } from "./recurring-forms";

interface RecurringBookingsPageProps {
  params: Promise<{ slug: string }>;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function RecurringBookingsContent({ slug, orgId }: { slug: string; orgId: string }) {
  const supabase = await createServerSupabaseClient();

  // Fetch courts for the form
  const { data: courts } = await supabase
    .from("courts")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("sort_order");

  const recurringBookings = await getRecurringBookings(orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/o/${slug}/admin/bookings`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recurring Bookings</h1>
            <p className="text-gray-600">
              Create recurring court reservations for coaches, leagues, and groups
            </p>
          </div>
        </div>
      </div>

      {/* Create Form */}
      <RecurringBookingForm orgId={orgId} courts={courts || []} slug={slug} />

      {/* Existing Recurring Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Active Recurring Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {recurringBookings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recurring bookings yet</p>
          ) : (
            <div className="space-y-4">
              {recurringBookings.map((rb) => (
                <div
                  key={rb.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{rb.title}</h3>
                      <Badge variant={rb.is_active ? "default" : "secondary"}>
                        {rb.is_active ? "Active" : "Cancelled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {rb.courts?.name} &middot; {DAY_NAMES[rb.day_of_week]}s &middot;{" "}
                      {rb.start_time.slice(0, 5)} - {rb.end_time.slice(0, 5)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {rb.starts_on} to {rb.ends_on}
                    </p>
                    {rb.notes && (
                      <p className="text-xs text-gray-500 italic">{rb.notes}</p>
                    )}
                  </div>
                  {rb.is_active && (
                    <CancelRecurringButton
                      orgId={orgId}
                      recurringBookingId={rb.id}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function RecurringBookingsPage({
  params,
}: RecurringBookingsPageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  await requireOrgRole(org.id, "admin");

  return (
    <Suspense
      fallback={
        <div className="text-center py-8 text-gray-500">Loading...</div>
      }
    >
      <RecurringBookingsContent slug={slug} orgId={org.id} />
    </Suspense>
  );
}
