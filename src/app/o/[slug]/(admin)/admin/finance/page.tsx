import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgBySlug } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinanceDateFilter } from "./finance-client";

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

  // Fetch data in parallel
  const [revenueResult, memberResult, invoicesResult, recentPayments] =
    await Promise.all([
      supabase.rpc("get_org_revenue_summary", {
        p_org_id: org.id,
        p_start_date: startDate.toISOString(),
        p_end_date: now.toISOString(),
      }),
      supabase.rpc("get_member_growth", {
        p_org_id: org.id,
        p_start_date: startDate.toISOString(),
        p_end_date: now.toISOString(),
      }),
      supabase
        .from("invoices")
        .select("*")
        .eq("organization_id", org.id)
        .in("status", ["sent", "overdue"])
        .order("due_date", { ascending: true })
        .limit(10),
      supabase
        .from("payments")
        .select("*, bookings(type), users(name, email)")
        .eq("organization_id", org.id)
        .eq("status", "COMPLETED")
        .order("paid_at", { ascending: false })
        .limit(10),
    ]);

  const revenue = (revenueResult.data as Record<string, number>) || {
    booking_revenue_cents: 0,
    membership_revenue_cents: 0,
    total_revenue_cents: 0,
    booking_count: 0,
  };

  const members = (memberResult.data as Record<string, number>) || {
    new_members: 0,
    total_members: 0,
    active_members: 0,
  };

  const outstandingInvoices = invoicesResult.data || [];
  const payments = recentPayments.data || [];

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
              ${((revenue.total_revenue_cents || 0) / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Booking Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${((revenue.booking_revenue_cents || 0) / 100).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {revenue.booking_count || 0} bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Membership Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${((revenue.membership_revenue_cents || 0) / 100).toFixed(2)}
            </p>
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
              $
              {revenue.booking_count && revenue.booking_count > 0
                ? (
                    (revenue.booking_revenue_cents || 0) /
                    revenue.booking_count /
                    100
                  ).toFixed(2)
                : "0.00"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Member Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{members.total_members || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{members.active_members || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              New Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{members.new_members || 0}</p>
            <p className="text-sm text-gray-500 mt-1">in {periodLabel.toLowerCase()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {outstandingInvoices.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No outstanding invoices
            </p>
          ) : (
            <div className="divide-y">
              {outstandingInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="py-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium font-mono text-sm">
                      {invoice.invoice_number}
                    </p>
                    <p className="text-sm text-gray-500">
                      Due{" "}
                      {invoice.due_date
                        ? new Date(invoice.due_date).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ${(invoice.total_cents / 100).toFixed(2)}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                        invoice.status === "overdue"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                      {(payment.bookings as { type?: string })?.type?.replace(
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
                    ${(payment.amount_cents / 100).toFixed(2)}
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
