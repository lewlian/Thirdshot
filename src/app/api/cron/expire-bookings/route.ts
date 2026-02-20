import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Cron endpoint to expire unpaid bookings
 * Called by Vercel Cron every 5 minutes (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (optional but recommended for production)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = createAdminSupabaseClient();

    // Use RPC for atomic batch expiration
    const { data, error } = await adminClient.rpc('expire_pending_bookings');

    if (error) {
      console.error("Error expiring bookings:", error);
      return NextResponse.json(
        { error: "Failed to expire bookings" },
        { status: 500 }
      );
    }

    const result = data as { expired_count: number; booking_ids: string[] };

    if (result.expired_count === 0) {
      return NextResponse.json({
        message: "No expired bookings found",
        expiredCount: 0,
      });
    }

    return NextResponse.json({
      message: `Expired ${result.expired_count} bookings`,
      expiredCount: result.expired_count,
      bookingIds: result.booking_ids,
    });
  } catch (error) {
    console.error("Error expiring bookings:", error);
    return NextResponse.json(
      { error: "Failed to expire bookings" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
