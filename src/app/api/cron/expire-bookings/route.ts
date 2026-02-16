import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron endpoint to expire unpaid bookings
 * Called by Vercel Cron every 5 minutes (configured in vercel.json)
 *
 * @route GET /api/cron/expire-bookings
 * @access Protected by optional CRON_SECRET environment variable
 *
 * Functionality:
 * - Finds all PENDING_PAYMENT bookings where expiresAt has passed
 * - Updates booking status to EXPIRED with cancellation reason
 * - Updates associated payment status to EXPIRED
 * - Releases time slots back to inventory
 *
 * Request headers:
 * - Authorization: Bearer {CRON_SECRET} (optional)
 *
 * Response:
 * - 200: { message, expiredCount, bookingIds }
 * - 401: Unauthorized (invalid CRON_SECRET)
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (optional but recommended for production)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all bookings that:
    // 1. Are in PENDING_PAYMENT status
    // 2. Have an expiresAt that has passed
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: "PENDING_PAYMENT",
        expiresAt: {
          lt: now,
        },
      },
      include: {
        payment: true,
      },
    });

    if (expiredBookings.length === 0) {
      return NextResponse.json({
        message: "No expired bookings found",
        expiredCount: 0,
      });
    }

    // Expire all found bookings
    const expiredIds = expiredBookings.map((b) => b.id);

    await prisma.$transaction([
      // Update bookings to EXPIRED with cancellation reason
      prisma.booking.updateMany({
        where: {
          id: { in: expiredIds },
        },
        data: {
          status: "EXPIRED",
          cancelledAt: now,
          cancelReason: "Payment timeout - booking expired after 10 minutes",
        },
      }),
      // Update associated payments to EXPIRED
      prisma.payment.updateMany({
        where: {
          bookingId: { in: expiredIds },
          status: "PENDING",
        },
        data: {
          status: "EXPIRED",
        },
      }),
    ]);

    return NextResponse.json({
      message: `Expired ${expiredIds.length} bookings`,
      expiredCount: expiredIds.length,
      bookingIds: expiredIds,
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
