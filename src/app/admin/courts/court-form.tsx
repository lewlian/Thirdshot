"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createCourt, updateCourt, deleteCourt } from "@/lib/actions/admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Court {
  id: string;
  name: string;
  description: string | null;
  price_per_hour_cents: number;
  is_active: boolean;
}

interface CourtFormProps {
  court?: Court;
  orgId?: string;
}

export function CourtForm({ court, orgId }: CourtFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(court?.is_active ?? true);

  const isEditing = !!court;

  const handleSubmit = (formData: FormData) => {
    formData.set("isActive", isActive.toString());
    if (orgId) {
      formData.set("orgId", orgId);
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateCourt(court.id, formData)
        : await createCourt(formData);

      if (result.success) {
        router.push("/admin/courts");
      } else {
        setError(result.error || "Something went wrong");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCourt(court!.id, orgId || "");

      if (result.success) {
        router.push("/admin/courts");
      } else {
        setError(result.error || "Failed to delete court");
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Court Name *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={court?.name || ""}
          placeholder="e.g., Court A - Indoor"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={court?.description || ""}
          placeholder="Optional description of the court..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pricePerHour">Price per Hour (SGD) *</Label>
        <Input
          id="pricePerHour"
          name="pricePerHour"
          type="number"
          step="0.01"
          min="0"
          defaultValue={
            court ? (court.price_per_hour_cents / 100).toFixed(2) : ""
          }
          placeholder="e.g., 20.00"
          required
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="isActive">Active</Label>
          <p className="text-sm text-gray-500">
            Inactive courts won&apos;t be available for booking
          </p>
        </div>
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </div>

      <div className="flex justify-between pt-4">
        <div>
          {isEditing && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={isPending}>
                  Delete Court
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Court</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this court? This action
                    cannot be undone. Courts with active bookings cannot be
                    deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : isEditing
                ? "Update Court"
                : "Create Court"}
          </Button>
        </div>
      </div>
    </form>
  );
}
