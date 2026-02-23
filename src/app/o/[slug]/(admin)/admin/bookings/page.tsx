import { Suspense } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgBySlug } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Repeat } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { BookingStatusFilter } from "@/app/admin/bookings/status-filter";
import { AdminBookingActions } from "@/app/admin/bookings/booking-actions";

interface AdminBookingsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}

async function getBookings(
  organizationId: string,
  status?: string,
  page: number = 1
) {
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createServerSupabaseClient();

  let bookingsQuery = supabase
    .from("bookings")
    .select("*, users(*), payments(*), booking_slots(*, courts(*))")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(from, to);

  let countQuery = supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (status) {
    const statusUpper = status.toUpperCase() as
      | "CONFIRMED"
      | "PENDING_PAYMENT"
      | "CANCELLED"
      | "EXPIRED"
      | "COMPLETED"
      | "NO_SHOW";
    bookingsQuery = bookingsQuery.eq("status", statusUpper);
    countQuery = countQuery.eq("status", statusUpper);
  }

  const [{ data: bookings }, { count: total }] = await Promise.all([
    bookingsQuery,
    countQuery,
  ]);

  return {
    bookings: bookings || [],
    total: total || 0,
    pages: Math.ceil((total || 0) / pageSize),
    currentPage: page,
  };
}

async function BookingsContent({
  slug,
  organizationId,
  timezone,
  searchParams,
}: {
  slug: string;
  organizationId: string;
  timezone: string;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page } = await searchParams;
  const pageNum = page ? parseInt(page) : 1;
  const { bookings, total, pages, currentPage } = await getBookings(
    organizationId,
    status,
    pageNum
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600">
            {total} total booking{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href={`/o/${slug}/admin/bookings/recurring`}>
              <Repeat className="h-4 w-4 mr-2" />
              Recurring
            </Link>
          </Button>
          <BookingStatusFilter currentStatus={status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No bookings found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">User</th>
                    <th className="text-left py-3 px-2 font-medium">Court</th>
                    <th className="text-left py-3 px-2 font-medium">
                      Date/Time
                    </th>
                    <th className="text-left py-3 px-2 font-medium">Amount</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                    <th className="text-left py-3 px-2 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bookings.map((booking) => {
                    const sortedSlots = [
                      ...(booking.booking_slots || []),
                    ].sort(
                      (a, b) =>
                        new Date(a.start_time).getTime() -
                        new Date(b.start_time).getTime()
                    );
                    const firstSlot = sortedSlots[0];
                    return (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium">
                              {booking.users?.name || "No name"}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {booking.users?.email}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {firstSlot
                            ? sortedSlots.length > 1
                              ? `${sortedSlots.length} slots`
                              : firstSlot.courts?.name
                            : "No slots"}
                        </td>
                        <td className="py-3 px-2">
                          {firstSlot ? (
                            <div>
                              <p>
                                {formatInTimeZone(
                                  firstSlot.start_time,
                                  timezone,
                                  "dd MMM yyyy"
                                )}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {formatInTimeZone(
                                  firstSlot.start_time,
                                  timezone,
                                  "h:mm a"
                                )}{" "}
                                -{" "}
                                {formatInTimeZone(
                                  firstSlot.end_time,
                                  timezone,
                                  "h:mm a"
                                )}
                                {sortedSlots.length > 1 &&
                                  ` (+${sortedSlots.length - 1})`}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          ${(booking.total_cents / 100).toFixed(2)}
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-full ${
                              booking.status === "CONFIRMED"
                                ? "bg-green-100 text-green-800"
                                : booking.status === "PENDING_PAYMENT"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {booking.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <AdminBookingActions
                            bookingId={booking.id}
                            status={booking.status}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/o/${slug}/admin/bookings?${status ? `status=${status}&` : ""}page=${p}`}
                  className={`px-3 py-1 rounded ${
                    p === currentPage
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AdminBookingsPage({
  params,
  searchParams,
}: AdminBookingsPageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  return (
    <Suspense
      fallback={
        <div className="text-center py-8 text-gray-500">
          Loading bookings...
        </div>
      }
    >
      <BookingsContent
        slug={slug}
        organizationId={org.id}
        timezone={org.timezone}
        searchParams={searchParams}
      />
    </Suspense>
  );
}
