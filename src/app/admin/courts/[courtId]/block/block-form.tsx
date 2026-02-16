"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCourtBlock } from "@/lib/actions/admin";

interface BlockFormProps {
  courtId: string;
}

export function BlockForm({ courtId }: BlockFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    formData.set("courtId", courtId);

    startTransition(async () => {
      const result = await createCourtBlock(formData);

      if (result.success) {
        router.refresh();
        // Reset form
        const form = document.getElementById("block-form") as HTMLFormElement;
        form?.reset();
        setError(null);
      } else {
        setError(result.error || "Something went wrong");
      }
    });
  };

  return (
    <form id="block-form" action={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time *</Label>
          <Input
            id="startTime"
            name="startTime"
            type="datetime-local"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">End Time *</Label>
          <Input id="endTime" name="endTime" type="datetime-local" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason (optional)</Label>
        <Textarea
          id="reason"
          name="reason"
          placeholder="e.g., Maintenance, Private event, Tournament..."
          rows={2}
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create Block"}
      </Button>
    </form>
  );
}
