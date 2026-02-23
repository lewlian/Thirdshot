"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createCourtBlock } from "@/lib/actions/admin";
import type { CalendarCourt } from "./types";

interface CreateBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courts: CalendarCourt[];
  prefillCourtId?: string;
  prefillDate?: string; // YYYY-MM-DD
  prefillHour?: number;
  orgId: string;
  timezone: string;
}

export function CreateBlockDialog({
  open,
  onOpenChange,
  courts,
  prefillCourtId,
  prefillDate,
  prefillHour,
  orgId,
  timezone,
}: CreateBlockDialogProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultStartHour = prefillHour ?? 8;
  const defaultEndHour = Math.min(defaultStartHour + 1, 23);

  const pad = (n: number) => n.toString().padStart(2, "0");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreating(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const result = await createCourtBlock(formData);
    setCreating(false);

    if (result.success) {
      onOpenChange(false);
      router.refresh();
    } else {
      setError(result.error || "Failed to create block");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block Court Time</DialogTitle>
          <DialogDescription>
            Prevent bookings during this time period.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="orgId" value={orgId} />

          <div>
            <label className="text-sm font-medium" htmlFor="block-court">
              Court
            </label>
            <select
              id="block-court"
              name="courtId"
              defaultValue={prefillCourtId || courts[0]?.id || ""}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="block-start">
              Start Time
            </label>
            <input
              id="block-start"
              name="startTime"
              type="datetime-local"
              defaultValue={
                prefillDate
                  ? `${prefillDate}T${pad(defaultStartHour)}:00`
                  : undefined
              }
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="block-end">
              End Time
            </label>
            <input
              id="block-end"
              name="endTime"
              type="datetime-local"
              defaultValue={
                prefillDate
                  ? `${prefillDate}T${pad(defaultEndHour)}:00`
                  : undefined
              }
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="block-reason">
              Reason
            </label>
            <select
              id="block-reason"
              name="reason"
              defaultValue="OTHER"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="MAINTENANCE">Maintenance</option>
              <option value="TOURNAMENT">Tournament</option>
              <option value="PRIVATE_EVENT">Private Event</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Block"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
