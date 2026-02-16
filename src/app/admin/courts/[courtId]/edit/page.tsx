import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourtForm } from "../../court-form";

interface EditCourtPageProps {
  params: Promise<{ courtId: string }>;
}

export default async function EditCourtPage({ params }: EditCourtPageProps) {
  const { courtId } = await params;

  const court = await prisma.court.findUnique({
    where: { id: courtId },
  });

  if (!court) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Court</h1>
        <p className="text-gray-600">Update court details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Court Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CourtForm court={court} />
        </CardContent>
      </Card>
    </div>
  );
}
