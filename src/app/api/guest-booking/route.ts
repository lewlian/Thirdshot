import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

export const guestBookingSchema = z.object({
  orgId: z.string().min(1),
  guestName: z.string().min(1, "Name is required"),
  guestEmail: z.string().email("Invalid email"),
  guestPhone: z.string().nullable().optional(),
  slots: z.array(
    z.object({
      courtId: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      priceInCents: z.number(),
    })
  ).min(1, "At least one slot is required"),
});

/**
 * Public guest booking API endpoint.
 * Creates a guest record (or finds existing) and creates a booking.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = guestBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { orgId, guestName, guestEmail, guestPhone, slots } = parsed.data;

    const supabase = await createServerSupabaseClient();

    // Check that org allows guest bookings
    const { data: org } = await supabase
      .from("organizations")
      .select("id, allow_guest_bookings, payment_timeout_minutes")
      .eq("id", orgId)
      .single();

    if (!org || !org.allow_guest_bookings) {
      return NextResponse.json(
        { error: "Guest bookings are not allowed for this organization" },
        { status: 403 }
      );
    }

    // Upsert guest record
    const { data: existingGuest } = await supabase
      .from("guests")
      .select("id")
      .eq("organization_id", orgId)
      .eq("email", guestEmail)
      .single();

    let guestId: string;

    if (existingGuest) {
      guestId = existingGuest.id;
    } else {
      const { data: newGuest, error: guestError } = await supabase
        .from("guests")
        .insert({
          id: crypto.randomUUID(),
          organization_id: orgId,
          email: guestEmail,
          name: guestName,
          phone: guestPhone || null,
        })
        .select()
        .single();

      if (guestError || !newGuest) {
        return NextResponse.json(
          { error: "Failed to create guest record" },
          { status: 500 }
        );
      }

      guestId = newGuest.id;
    }

    // Calculate total
    const totalCents = slots.reduce((sum, s) => sum + s.priceInCents, 0);

    // Create booking using RPC (we need a guest-aware version)
    // For now, we create booking directly since guest bookings don't use the
    // standard RPC (which requires user_id). We use a direct insert approach.

    const bookingId = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + (org.payment_timeout_minutes || 15) * 60 * 1000
    ).toISOString();

    // We need a "system" user_id for guest bookings. Use the guest_id field instead.
    // The bookings table requires user_id NOT NULL, so for guest bookings we'll need
    // a placeholder. Let's check if we can make it nullable, or use a system user.
    // For MVP, we'll create with a placeholder and use guest_id for identification.

    // Check slot availability first
    for (const slot of slots) {
      const { count } = await supabase
        .from("booking_slots")
        .select("*, bookings!inner(status)", { count: "exact", head: true })
        .eq("court_id", slot.courtId)
        .eq("organization_id", orgId)
        .lt("start_time", slot.endTime)
        .gt("end_time", slot.startTime)
        .in("bookings.status", ["CONFIRMED", "PENDING_PAYMENT"]);

      if (count && count > 0) {
        return NextResponse.json(
          { error: "One or more slots are no longer available" },
          { status: 409 }
        );
      }
    }

    // For guest bookings, we'll use a special approach:
    // Store guest_id on the booking and use a system placeholder for user_id
    // In a production system, we'd make user_id nullable. For now, use guest_id field.

    // First, check if there's a converted user for this guest
    const { data: guestData } = await supabase
      .from("guests")
      .select("converted_to_user_id")
      .eq("id", guestId)
      .single();

    // If guest has been converted to a user, use that user_id
    // Otherwise, we need a system/placeholder approach
    // For simplicity, create the booking with guest info stored and use a guest-system user

    const userId = guestData?.converted_to_user_id || "guest-system";

    const { error: bookingError } = await supabase.from("bookings").insert({
      id: bookingId,
      organization_id: orgId,
      user_id: userId,
      guest_id: guestId,
      type: "COURT_BOOKING",
      total_cents: totalCents,
      currency: "SGD",
      status: "PENDING_PAYMENT",
      expires_at: expiresAt,
    });

    if (bookingError) {
      console.error("Guest booking error:", bookingError);
      return NextResponse.json(
        { error: "Failed to create booking" },
        { status: 500 }
      );
    }

    // Insert slots
    const slotInserts = slots.map((slot) => ({
      id: crypto.randomUUID(),
      organization_id: orgId,
      booking_id: bookingId,
      court_id: slot.courtId,
      start_time: slot.startTime,
      end_time: slot.endTime,
      price_in_cents: slot.priceInCents,
    }));

    const { error: slotsError } = await supabase
      .from("booking_slots")
      .insert(slotInserts);

    if (slotsError) {
      // Clean up booking
      await supabase.from("bookings").delete().eq("id", bookingId);
      return NextResponse.json(
        { error: "Failed to create booking slots" },
        { status: 500 }
      );
    }

    // Create payment record
    await supabase.from("payments").insert({
      id: crypto.randomUUID(),
      organization_id: orgId,
      booking_id: bookingId,
      user_id: userId,
      amount_cents: totalCents,
      currency: "SGD",
      status: "PENDING",
    });

    // Update guest booking count
    await supabase
      .from("guests")
      .update({
        total_bookings: (await supabase
          .from("guests")
          .select("total_bookings")
          .eq("id", guestId)
          .single()
          .then(r => r.data?.total_bookings || 0)) + 1,
        last_booking_at: new Date().toISOString(),
      })
      .eq("id", guestId);

    return NextResponse.json({
      success: true,
      bookingId,
    });
  } catch (error) {
    console.error("Guest booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
