import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";

const TIMEZONE = "Asia/Singapore";

async function getDashboardStats() {
  const now = new Date();
  const startOfToday = new Date(
    formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd") + "T00:00:00+08:00"
  );
  const endOfToday = new Date(
    formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd") + "T23:59:59+08:00"
  );

  const [
    totalUsers,
    totalBookings,
    totalCourts,
    todayBookings,
    pendingBookings,
    recentBookings,
    revenue,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.booking.count(),
    prisma.court.count(),
    // Count today's confirmed bookings by checking their slots
    prisma.bookingSlot.count({
      where: {
        startTime: { gte: startOfToday, lte: endOfToday },
        booking: {
          status: "CONFIRMED",
        },
      },
    }),
    prisma.booking.count({
      where: { status: "PENDING_PAYMENT" },
    }),
    prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        slots: {
          include: { court: true },
          orderBy: { startTime: "asc" },
        },
      },
    }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amountCents: true },
    }),
  ]);

  return {
    totalUsers,
    totalBookings,
    totalCourts,
    todayBookings,
    pendingBookings,
    recentBookings,
    totalRevenue: revenue._sum.amountCents || 0,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your court booking system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalBookings}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Today&apos;s Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.todayBookings}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${(stats.totalRevenue / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Courts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalCourts}</p>
            <Link
              href="/admin/courts"
              className="text-sm text-green-600 hover:underline"
            >
              Manage courts →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.pendingBookings}</p>
            {stats.pendingBookings > 0 && (
              <Link
                href="/admin/bookings?status=pending"
                className="text-sm text-orange-600 hover:underline"
              >
                View pending →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Bookings</CardTitle>
            <Link
              href="/admin/bookings"
              className="text-sm text-green-600 hover:underline"
            >
              View all →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentBookings.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No bookings yet</p>
          ) : (
            <div className="divide-y">
              {stats.recentBookings.map((booking) => {
                const firstSlot = booking.slots[0];
                return (
                  <div
                    key={booking.id}
                    className="py-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">
                        {booking.user.name || booking.user.email}
                      </p>
                      <p className="text-sm text-gray-500">
                        {firstSlot
                          ? booking.slots.length > 1
                            ? `${booking.slots.length} slots • ${formatInTimeZone(
                                firstSlot.startTime,
                                TIMEZONE,
                                "dd MMM, h:mm a"
                              )}`
                            : `${firstSlot.court.name} • ${formatInTimeZone(
                                firstSlot.startTime,
                                TIMEZONE,
                                "dd MMM, h:mm a"
                              )}`
                          : "No slots"}
                      </p>
                    </div>
                    <div className="text-right">
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
