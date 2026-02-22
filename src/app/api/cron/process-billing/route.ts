import { NextRequest, NextResponse } from "next/server";
import {
  processDueBillings,
  handlePastDueSubscriptions,
} from "@/lib/billing/subscriptions";

/**
 * Cron endpoint to process recurring membership billing.
 * Runs daily at 2 AM (configured in vercel.json).
 *
 * Steps:
 * 1. Find active subscriptions with next_billing_date <= now
 * 2. Generate invoices for each
 * 3. Handle past-due subscriptions (suspend after grace period)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Process due billings
    const billingResult = await processDueBillings();

    // Handle past-due subscriptions (7-day grace period)
    const pastDueResult = await handlePastDueSubscriptions(7);

    return NextResponse.json({
      success: true,
      billing: billingResult,
      pastDue: pastDueResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Billing cron error:", error);
    return NextResponse.json(
      {
        error: "Billing processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
