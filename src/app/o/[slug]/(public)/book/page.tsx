import { getOrgBySlug } from "@/lib/org-context";
import { getCalendarAvailability } from "@/lib/booking/aggregated-availability";
import { PublicBookingView } from "./public-booking-view";

interface PublicBookPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicBookPage({ params }: PublicBookPageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  if (!org.allow_guest_bookings) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Members Only
        </h1>
        <p className="text-gray-600 mb-6">
          This facility requires membership to book courts.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/login"
            className="px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 font-medium"
          >
            Sign in
          </a>
          <a
            href={`/o/${slug}/join`}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 font-medium"
          >
            Become a Member
          </a>
        </div>
      </div>
    );
  }

  const availability = await getCalendarAvailability(org.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Book a Court
        </h1>
        <p className="text-gray-600 mt-1">
          Choose your preferred date and time to play at {org.name}
        </p>
      </div>

      <PublicBookingView
        availability={availability}
        orgId={org.id}
        orgSlug={slug}
        orgName={org.name}
      />
    </div>
  );
}
