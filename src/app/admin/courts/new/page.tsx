import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourtForm } from "../court-form";

export default function NewCourtPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Court</h1>
        <p className="text-gray-600">Create a new pickleball court</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Court Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CourtForm />
        </CardContent>
      </Card>
    </div>
  );
}
