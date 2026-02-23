"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createRecurringBooking,
  cancelRecurringBooking,
} from "@/lib/actions/recurring-bookings";

interface Court {
  id: string;
  name: string;
}

const DAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export function RecurringBookingForm({
  orgId,
  courts,
  slug,
}: {
  orgId: string;
  courts: Court[];
  slug: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createRecurringBooking(orgId, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || "Recurring booking created");
        router.refresh();
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Recurring Booking</CardTitle>
        <CardDescription>
          Reserve a court on a recurring schedule. Individual bookings will be created
          automatically with no payment required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Tuesday Coaching - Coach Mike"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="courtId">Court</Label>
              <Select name="courtId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select court" />
                </SelectTrigger>
                <SelectContent>
                  {courts.map((court) => (
                    <SelectItem key={court.id} value={court.id}>
                      {court.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">Day of Week</Label>
              <Select name="dayOfWeek" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" name="startTime" type="time" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" name="endTime" type="time" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startsOn">Starts On</Label>
              <Input id="startsOn" name="startsOn" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsOn">Ends On</Label>
              <Input id="endsOn" name="endsOn" type="date" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Recurring Booking"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function CancelRecurringButton({
  orgId,
  recurringBookingId,
}: {
  orgId: string;
  recurringBookingId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCancel = () => {
    if (!confirm("Cancel this recurring booking and all future instances?")) {
      return;
    }

    startTransition(async () => {
      const result = await cancelRecurringBooking(orgId, recurringBookingId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || "Recurring booking cancelled");
        router.refresh();
      }
    });
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleCancel}
      disabled={isPending}
    >
      {isPending ? "Cancelling..." : "Cancel Series"}
    </Button>
  );
}
