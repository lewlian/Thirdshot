import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgBySlug } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinanceDateFilter } from "./finance-client";
import { getCurrencySymbol, formatCurrency } from "@/lib/utils";

interface FinancePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function FinancePage({
  params,
  searchParams,
}: FinancePageProps) {
  const { slug } = await params;
  const { period = "30d" } = await searchParams;
  const org = await getOrgBySlug(slug);

  const supabase = await createServerSupabaseClient();

  // Calculate date range from period
  const now = new Date();
  const startDate = new Date(now);
  switch (period) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(now.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "ytd":
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  // Fetch data using direct queries instead of non-existent RPCs
  const [paymentsResult, membersResult, totalMembersResult, recentPayments] =
    await Promise.all([
      // Revenue from completed payments in period
      supabase
        .from("payments")
        .select("amount_cents")
        .eq("organization_id", org.id)
        .eq("status", "COMPLETED")
        .gte("paid_at", startDate.toISOString())
        .lte("paid_at", now.toISOString()),
      // New members in period
      supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .gte("joined_at", startDate.toISOString()),
      // Total & active members
      supabase
        .from("organization_members")
        .select("membership_status", { count: "exact" })
        .eq("organization_id", org.id),
      // Recent completed payments
      supabase
        .from("payments")
        .select("*, bookings(type), users(name, email)")
        .eq("organization_id", org.id)
        .eq("status", "COMPLETED")
        .order("paid_at", { ascending: false })
        .limit(10),
    ]);

  const completedPayments = paymentsResult.data || [];
  const totalRevenueCents = completedPayments.reduce(
    (sum, p) => sum + (p.amount_cents || 0),
    0
  );
  const bookingCount = completedPayments.length;

  const allMembers = totalMembersResult.data || [];
  const totalMembers = allMembers.length;
  const activeMembers = allMembers.filter(
    (m) => m.membership_status === "active"
  ).length;
  const newMembers = membersResult.count || 0;

  const payments = recentPayments.data || [];

  const currency = org.currency || "SGD";
  const currencySymbol = getCurrencySymbol(currency);

  const periodLabel =
    period === "7d"
      ? "Last 7 days"
      : period === "90d"
        ? "Last 90 days"
        : period === "ytd"
          ? "Year to date"
          : "Last 30 days";

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-gray-600">{periodLabel}</p>
        </div>
        <FinanceDateFilter slug={slug} currentPeriod={period} />
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {currencySymbol}{(totalRevenueCents / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{bookingCount}</p>
            <p className="text-sm text-gray-500 mt-1">completed payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Avg Booking Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {currencySymbol}
              {bookingCount > 0
                ? (totalRevenueCents / bookingCount / 100).toFixed(2)
                : "0.00"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              New Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{newMembers}</p>
            <p className="text-sm text-gray-500 mt-1">in {periodLabel.toLowerCase()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Member Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalMembers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeMembers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No payments yet</p>
          ) : (
            <div className="divide-y">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="py-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {(payment.users as { name?: string; email?: string })
                        ?.name ||
                        (payment.users as { name?: string; email?: string })
                          ?.email ||
                        "Guest"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(payment.bookings as { type?: string })?.type?.replaceAll(
                        "_",
                        " "
                      ) || "Payment"}{" "}
                      &bull;{" "}
                      {payment.paid_at
                        ? new Date(payment.paid_at).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                  <p className="font-medium">
                    {currencySymbol}{(payment.amount_cents / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
