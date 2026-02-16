import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBookableDates } from "@/lib/booking/availability";
import { CourtBookingForm } from "./booking-form";

interface CourtPageProps {
  params: Promise<{ courtId: string }>;
}

export async function generateMetadata({ params }: CourtPageProps) {
  const { courtId } = await params;
  const court = await prisma.court.findUnique({
    where: { id: courtId },
  });

  if (!court) {
    return { title: "Court Not Found" };
  }

  return {
    title: `Book ${court.name} - Thirdshot`,
    description: court.description || `Book ${court.name} at Thirdshot`,
  };
}

export default async function CourtPage({ params }: CourtPageProps) {
  const { courtId } = await params;

  const court = await prisma.court.findUnique({
    where: { id: courtId },
  });

  if (!court || !court.isActive) {
    notFound();
  }

  const bookableDates = await getBookableDates();

  // Get max consecutive slots setting
  const maxSlotsSetting = await prisma.appSetting.findUnique({
    where: { key: "max_consecutive_slots" },
  });
  const maxSlots = maxSlotsSetting ? parseInt(maxSlotsSetting.value) : 3;

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
        />
      </div>
    </div>
  );
}
