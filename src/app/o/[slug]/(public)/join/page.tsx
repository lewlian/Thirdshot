import { redirect } from "next/navigation";
import { getOrgBySlug } from "@/lib/org-context";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, CheckCircle } from "lucide-react";
import Link from "next/link";

interface JoinPageProps {
  params: Promise<{ slug: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  const supabase = await createServerSupabaseClient();
  const user = await getUser();

  // If logged in, try to auto-join
  if (user) {
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("supabase_id", user.id)
      .single();

    if (dbUser) {
      const adminClient = createAdminSupabaseClient();

      // Check if already a member
      const { data: existing } = await adminClient
        .from("organization_members")
        .select("id")
        .eq("organization_id", org.id)
        .eq("user_id", dbUser.id)
        .maybeSingle();

      if (existing) {
        // Already a member — go straight to courts
        redirect(`/o/${slug}/courts`);
      }

      // Auto-join as member
      await adminClient.from("organization_members").insert({
        id: crypto.randomUUID(),
        organization_id: org.id,
        user_id: dbUser.id,
        role: "member",
        membership_status: "active",
      });

      redirect(`/o/${slug}/courts`);
    }
  }

  // Not logged in — show sign up / sign in page
  const { data: tiers } = await supabase
    .from("membership_tiers")
    .select("*")
    .eq("organization_id", org.id)
    .eq("is_active", true)
    .order("sort_order");

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Join {org.name}
        </h1>
        <p className="text-gray-600 mt-2 max-w-lg mx-auto">
          Become a member and enjoy exclusive benefits including member pricing,
          priority booking, and more.
        </p>
      </div>

      {tiers && tiers.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier) => {
            const priceDisplay =
              tier.price_cents === 0
                ? "Free"
                : `$${(tier.price_cents / 100).toFixed(0)}/${tier.billing_period === "monthly" ? "mo" : tier.billing_period === "quarterly" ? "qtr" : "yr"}`;

            return (
              <Card
                key={tier.id}
                className="relative overflow-hidden"
              >
                {tier.sort_order === 1 && (
                  <div className="absolute top-0 left-0 right-0 bg-gray-900 text-white text-center text-xs py-1 font-medium">
                    Most Popular
                  </div>
                )}
                <CardHeader className={tier.sort_order === 1 ? "pt-10" : ""}>
                  <CardTitle className="flex items-center justify-between">
                    <span>{tier.name}</span>
                    <span className="text-2xl font-bold">{priceDisplay}</span>
                  </CardTitle>
                  {tier.description && (
                    <p className="text-sm text-muted-foreground">
                      {tier.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {tier.booking_discount_percent > 0 && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {tier.booking_discount_percent}% booking discount
                      </li>
                    )}
                    {tier.can_book_peak_hours && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Peak hour booking access
                      </li>
                    )}
                    {tier.priority_booking && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Priority booking
                      </li>
                    )}
                    {tier.max_advance_booking_days && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Book up to {tier.max_advance_booking_days} days ahead
                      </li>
                    )}
                    {tier.guest_passes_per_month > 0 && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {tier.guest_passes_per_month} guest passes/month
                      </li>
                    )}
                  </ul>

                  <Link
                    href={`/signup?redirect=/o/${slug}/join`}
                    className="block w-full text-center py-3 rounded-full bg-gray-900 text-white hover:bg-gray-800 font-medium text-sm"
                  >
                    Sign Up
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="max-w-md mx-auto">
          <CardContent className="py-8 text-center">
            <p className="text-gray-600 mb-4">
              Sign up to join {org.name} and start booking courts.
            </p>
            <Link
              href={`/signup?redirect=/o/${slug}/join`}
              className="inline-block px-8 py-3 rounded-full bg-gray-900 text-white hover:bg-gray-800 font-medium"
            >
              Sign Up
            </Link>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href={`/login?redirect=/o/${slug}/join`} className="text-gray-700 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
