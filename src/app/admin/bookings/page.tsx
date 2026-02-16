import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { BookingStatusFilter } from "./status-filter";
import { AdminBookingActions } from "./booking-actions";

const TIMEZONE = "Asia/Singapore";

interface AdminBookingsPageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

async function getBookings(status?: string, page: number = 1) {
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const where = status
    ? { status: status.toUpperCase() as "CONFIRMED" | "PENDING_PAYMENT" | "CANCELLED" }
    : {};

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        user: true,
        payment: true,
        slots: {
          include: { court: true },
          orderBy: { startTime: "asc" },
        },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings,
    total,
    pages: Math.ceil(total / pageSize),
    currentPage: page,
  };
}

export default async function AdminBookingsPage({
  searchParams,
}: AdminBookingsPageProps) {
  const { status, page } = await searchParams;
  const pageNum = page ? parseInt(page) : 1;
  const { bookings, total, pages, currentPage } = await getBookings(
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
        <BookingStatusFilter currentStatus={status} />
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
                    <th className="text-left py-3 px-2 font-medium">Date/Time</th>
                    <th className="text-left py-3 px-2 font-medium">Amount</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                    <th className="text-left py-3 px-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bookings.map((booking) => {
                    const firstSlot = booking.slots[0];
                    return (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium">
                              {booking.user.name || "No name"}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {booking.user.email}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {firstSlot
                            ? booking.slots.length > 1
                              ? `${booking.slots.length} slots`
                              : firstSlot.court.name
                            : "No slots"}
                        </td>
                        <td className="py-3 px-2">
                          {firstSlot ? (
                            <div>
                              <p>
                                {formatInTimeZone(
                                  firstSlot.startTime,
                                  TIMEZONE,
                                  "dd MMM yyyy"
                                )}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {formatInTimeZone(
                                  firstSlot.startTime,
                                  TIMEZONE,
                                  "h:mm a"
                                )}{" "}
                                -{" "}
                                {formatInTimeZone(
                                  firstSlot.endTime,
                                  TIMEZONE,
                                  "h:mm a"
                                )}
                                {booking.slots.length > 1 && ` (+${booking.slots.length - 1})`}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          ${(booking.totalCents / 100).toFixed(2)}
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
                  href={`/admin/bookings?${status ? `status=${status}&` : ""}page=${p}`}
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
