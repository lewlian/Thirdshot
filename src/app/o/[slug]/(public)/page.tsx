import { getOrgBySlug } from "@/lib/org-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Clock, MapPin, Phone, Mail, Globe } from "lucide-react";
import Link from "next/link";

interface ClubPageProps {
  params: Promise<{ slug: string }>;
}

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default async function ClubPage({ params }: ClubPageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  const supabase = await createServerSupabaseClient();

  // Fetch full org data, courts and tiers in parallel
  const [{ data: fullOrg }, { data: courts }, { data: tiers }] = await Promise.all([
    supabase
      .from("organizations")
      .select("hero_image_url, tagline, operating_hours")
      .eq("id", org.id)
      .single(),
    supabase
      .from("courts")
      .select("*")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("membership_tiers")
      .select("*")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const operatingHours = fullOrg?.operating_hours as Record<string, string> | null;
  const tagline = fullOrg?.tagline as string | null;
  const heroImageUrl = fullOrg?.hero_image_url as string | null;

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative -mx-4 sm:-mx-6 -mt-8 overflow-hidden rounded-b-2xl">
        {heroImageUrl ? (
          <div className="relative h-64 sm:h-80">
            <img
              src={heroImageUrl}
              alt={org.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-center text-center px-4">
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
                  {org.name}
                </h1>
                {tagline && (
                  <p className="text-lg sm:text-xl text-white/90 max-w-lg mx-auto">
                    {tagline}
                  </p>
                )}
                <Link
                  href={`/o/${slug}/book`}
                  className="inline-block mt-6 px-8 py-3 rounded-full bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors"
                >
                  Book Now
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="h-64 sm:h-80 flex items-center justify-center text-center px-4"
            style={{
              background: `linear-gradient(135deg, ${org.primary_color}, ${org.primary_color}dd)`,
            }}
          >
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
                {org.name}
              </h1>
              {tagline && (
                <p className="text-lg sm:text-xl text-white/90 max-w-lg mx-auto">
                  {tagline}
                </p>
              )}
              <Link
                href={`/o/${slug}/book`}
                className="inline-block mt-6 px-8 py-3 rounded-full bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors"
              >
                Book Now
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* About Section */}
      {(org.description || org.address || org.email || org.phone) && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">About</h2>
          {org.description && (
            <p className="text-gray-600 leading-relaxed">{org.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {org.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{org.address}{org.city ? `, ${org.city}` : ""}</span>
              </div>
            )}
            {org.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${org.email}`} className="hover:underline">
                  {org.email}
                </a>
              </div>
            )}
            {org.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <a href={`tel:${org.phone}`} className="hover:underline">
                  {org.phone}
                </a>
              </div>
            )}
            {org.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {org.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Courts Section */}
      {courts && courts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Our Courts</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courts.map((court) => (
              <Card key={court.id}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-lg mb-2">{court.name}</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      {court.is_indoor ? "Indoor" : "Outdoor"} &middot;{" "}
                      {court.surface_type || "Standard"}
                    </p>
                    <p className="text-base font-medium text-gray-900">
                      ${(court.price_per_hour_cents / 100).toFixed(0)}/hr
                    </p>
                    {court.peak_price_per_hour_cents != null && court.peak_price_per_hour_cents > court.price_per_hour_cents && (
                      <p className="text-xs text-gray-500">
                        Peak: ${(court.peak_price_per_hour_cents / 100).toFixed(0)}/hr
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Membership Tiers Section */}
      {tiers && tiers.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Membership</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier) => {
              const priceDisplay =
                tier.price_cents === 0
                  ? "Free"
                  : `$${(tier.price_cents / 100).toFixed(0)}/${
                      tier.billing_period === "monthly"
                        ? "mo"
                        : tier.billing_period === "quarterly"
                          ? "qtr"
                          : "yr"
                    }`;

              return (
                <Card key={tier.id} className="relative overflow-hidden">
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
                  <CardContent>
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="text-center">
            <Link
              href={`/o/${slug}/join`}
              className="inline-block px-8 py-3 rounded-full bg-gray-900 text-white hover:bg-gray-800 font-medium"
            >
              Join Now
            </Link>
          </div>
        </section>
      )}

      {/* Operating Hours Section */}
      {operatingHours && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Operating Hours</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {DAY_ORDER.map((day) => {
                  const hours = operatingHours[day];
                  if (!hours) return null;
                  return (
                    <div
                      key={day}
                      className="flex items-center justify-between py-2 border-b last:border-b-0 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{DAY_LABELS[day]}</span>
                      </div>
                      <span className="text-gray-600">
                        {hours === "closed" ? "Closed" : hours}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
