import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";
import { BookingList } from "@/components/booking/booking-list";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

export default async function BookingsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();

  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_id', user.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  const now = new Date();

  // First, expire any pending bookings that have timed out
  await supabase
    .from('bookings')
    .update({
      status: "EXPIRED",
      cancelled_at: now.toISOString(),
      cancel_reason: "Payment timeout - booking expired after 10 minutes",
    })
    .eq('user_id', dbUser.id)
    .eq('status', 'PENDING_PAYMENT')
    .lte('expires_at', now.toISOString());

  // Fetch all bookings for the user with their slots
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, booking_slots(*, courts(*))')
    .eq('user_id', dbUser.id)
    .order('created_at', { ascending: false });

  const allBookings = (bookings || []).map((b) => ({
    ...b,
    booking_slots: [...(b.booking_slots || [])].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    ),
  }));

  // Separate into upcoming, past, and cancelled/expired
  const upcomingBookings = allBookings.filter((b) => {
    if (b.status !== "CONFIRMED" || b.booking_slots.length === 0) return false;
    const firstSlot = b.booking_slots[0];
    return new Date(firstSlot.start_time) > now;
  });

  const pendingBookings = allBookings.filter(
    (b) => b.status === "PENDING_PAYMENT"
  );

  const pastBookings = allBookings.filter((b) => {
    if ((b.status !== "CONFIRMED" && b.status !== "COMPLETED") || b.booking_slots.length === 0) return false;
    const lastSlot = b.booking_slots[b.booking_slots.length - 1];
    return new Date(lastSlot.end_time) <= now;
  });

  const cancelledBookings = allBookings.filter(
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
