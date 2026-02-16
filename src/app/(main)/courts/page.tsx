import { CourtCard } from "@/components/common/court-card";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Courts - Thirdshot",
  description: "Browse and book our pickleball courts",
};

export default async function CourtsPage() {
  const courts = await prisma.court.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section with Gradient */}
      <div className="gradient-blue-bg text-white px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Our Courts</h1>
          <p className="text-white/90 text-base">
            Choose a court and book your slot. All courts are available 7 days in advance.
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {courts.length === 0 ? (
          <div className="card-elevated bg-card rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">No courts available at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 pb-8">
            {courts.map((court) => (
              <CourtCard key={court.id} court={court} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
