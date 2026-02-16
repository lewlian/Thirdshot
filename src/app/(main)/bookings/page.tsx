import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";
import { BookingList } from "@/components/booking/booking-list";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

export default async function BookingsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const now = new Date();

  // First, expire any pending bookings that have timed out
  await prisma.booking.updateMany({
    where: {
      userId: dbUser.id,
      status: "PENDING_PAYMENT",
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: "EXPIRED",
      cancelledAt: now,
      cancelReason: "Payment timeout - booking expired after 10 minutes",
    },
  });

  // Fetch all bookings for the user with their slots
  const bookings = await prisma.booking.findMany({
    where: { userId: dbUser.id },
    include: {
      slots: {
        include: { court: true },
        orderBy: { startTime: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Separate into upcoming, past, and cancelled/expired
  const upcomingBookings = bookings.filter((b) => {
    if (b.status !== "CONFIRMED" || b.slots.length === 0) return false;
    const firstSlot = b.slots[0];
    return new Date(firstSlot.startTime) > now;
  });

  const pendingBookings = bookings.filter(
    (b) => b.status === "PENDING_PAYMENT"
  );

  const pastBookings = bookings.filter((b) => {
    if ((b.status !== "CONFIRMED" && b.status !== "COMPLETED") || b.slots.length === 0) return false;
    const lastSlot = b.slots[b.slots.length - 1];
    return new Date(lastSlot.endTime) <= now;
  });

  const cancelledBookings = bookings.filter(
    (b) => b.status === "CANCELLED" || b.status === "EXPIRED"
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <Button asChild>
          <Link href="/courts">
            <Plus className="h-4 w-4 mr-2" />
            Book a Court
          </Link>
        </Button>
      </div>

      {pendingBookings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-yellow-600">
            Pending Payment ({pendingBookings.length})
          </h2>
          <BookingList bookings={pendingBookings} />
        </div>
      )}

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastBookings.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({cancelledBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <BookingList
            bookings={upcomingBookings}
            emptyMessage="No upcoming bookings. Book a court to get started!"
          />
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          <BookingList
            bookings={pastBookings}
            emptyMessage="No past bookings yet."
          />
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6">
          <BookingList
            bookings={cancelledBookings}
            emptyMessage="No cancelled or expired bookings."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
