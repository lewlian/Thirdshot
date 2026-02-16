import { NextRequest, NextResponse } from "next/server";
import { getCourtAvailability } from "@/lib/booking/availability";
import { parseISO, isValid } from "date-fns";
import {
  checkRateLimit,
  RATE_LIMITS,
  formatRateLimitError,
} from "@/lib/rate-limit";

/**
 * Court availability API endpoint
 * Returns all time slots with availability status for a specific court on a specific date
 *
 * @route GET /api/courts/[courtId]/availability
 * @access Public
 *
 * Query parameters:
 * - date: ISO date string (YYYY-MM-DD) - Required
 *
 * Response body:
 * - slots: Array of TimeSlot objects with:
 *   - startTime: Date
 *   - endTime: Date
 *   - isAvailable: boolean
 *   - isPeak: boolean
 *   - priceInCents: number
 *
 * Response codes:
 * - 200: Success with slots array
 * - 400: Missing or invalid date parameter
 * - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courtId: string }> }
) {
  const { courtId } = await params;

  // Get IP address for rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Check rate limit (60 requests per minute per IP)
  const rateLimit = checkRateLimit(ip, RATE_LIMITS.AVAILABILITY);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimit, "availability") },
      { status: 429 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const dateStr = searchParams.get("date");

  if (!dateStr) {
    return NextResponse.json(
      { error: "Date parameter is required" },
      { status: 400 }
    );
  }

  const date = parseISO(dateStr);
  if (!isValid(date)) {
    return NextResponse.json(
      { error: "Invalid date format" },
      { status: 400 }
    );
  }

  try {
    const slots = await getCourtAvailability(courtId, date);
    return NextResponse.json({ slots });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
