import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgBySlug } from "@/lib/org-context";
import { getBookableDates } from "@/lib/booking/availability";
import { CourtBookingForm } from "@/app/(main)/courts/[courtId]/booking-form";

interface CourtPageProps {
  params: Promise<{ slug: string; courtId: string }>;
}

export async function generateMetadata({ params }: CourtPageProps) {
  const { slug, courtId } = await params;
  const org = await getOrgBySlug(slug);
  const supabase = await createServerSupabaseClient();

  const { data: court } = await supabase
    .from('courts')
    .select('*')
    .eq('id', courtId)
    .eq('organization_id', org.id)
    .single();

  if (!court) {
    return { title: "Court Not Found" };
  }

  return {
    title: `Book ${court.name} - ${org.name}`,
    description: court.description || `Book ${court.name} at ${org.name}`,
  };
}

export default async function CourtPage({ params }: CourtPageProps) {
  const { slug, courtId } = await params;
  const org = await getOrgBySlug(slug);
  const supabase = await createServerSupabaseClient();

  const { data: court } = await supabase
    .from('courts')
    .select('*')
    .eq('id', courtId)
    .eq('organization_id', org.id)
    .single();

  if (!court || !court.is_active) {
    notFound();
  }

  const bookableDates = await getBookableDates(org.id);

  // Get max consecutive slots from org settings
  const maxSlots = org.max_consecutive_slots;

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section with Gradient */}
      <div className="gradient-blue-bg text-white px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Book {court.name}</h1>
          <p className="text-white/90 text-base">
            {court.description || 'Select your preferred date and time slots'}
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 pb-12">
        <CourtBookingForm
          court={court}
          bookableDates={bookableDates}
          maxSlots={maxSlots}
          orgId={org.id}
          orgSlug={slug}
        />
      </div>
    </div>
  );
}
