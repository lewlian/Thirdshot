import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";
import { generateICalEvent } from "@/lib/calendar/ical";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, role")
    .eq("supabase_id", user.id)
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, booking_slots(*, courts(*)), organizations(name, address, city)")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Auth check: must own booking or be admin
  if (booking.user_id !== dbUser.id && dbUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (booking.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Only confirmed bookings can be added to calendar" },
      { status: 400 }
    );
  }

  const sortedSlots = [...(booking.booking_slots || [])].sort(
    (a: { start_time: string }, b: { start_time: string }) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  const firstSlot = sortedSlots[0];
  const lastSlot = sortedSlots[sortedSlots.length - 1];

  if (!firstSlot || !lastSlot) {
    return NextResponse.json({ error: "No slots found" }, { status: 400 });
  }

  const org = booking.organizations;
  const courtName =
    sortedSlots.length > 1
      ? `${sortedSlots.length} courts`
      : firstSlot.courts?.name || "Court";

  const location = [org?.name, org?.address, org?.city]
    .filter(Boolean)
    .join(", ");

  const ical = generateICalEvent({
    title: `Pickleball - ${courtName}`,
    description: `Booking ID: ${booking.id}\nCourt: ${courtName}`,
    location,
    startTime: new Date(firstSlot.start_time),
    endTime: new Date(lastSlot.end_time),
    bookingId: booking.id,
  });

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="booking-${booking.id}.ics"`,
    },
  });
}
