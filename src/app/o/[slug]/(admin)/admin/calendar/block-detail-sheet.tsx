"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import { formatInTimeZone } from "date-fns-tz";
import { deleteCourtBlock } from "@/lib/actions/admin";
import type { CalendarBlock } from "./types";

interface BlockDetailSheetProps {
  block: CalendarBlock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timezone: string;
  orgId: string;
}

const reasonLabels: Record<string, string> = {
  MAINTENANCE: "Maintenance",
  TOURNAMENT: "Tournament",
  PRIVATE_EVENT: "Private Event",
  OTHER: "Other",
};

export function BlockDetailSheet({
  block,
  open,
  onOpenChange,
  timezone,
  orgId,
}: BlockDetailSheetProps) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  if (!block) return null;

  async function handleRemove() {
    if (!block) return;
    setRemoving(true);
    const result = await deleteCourtBlock(block.id, orgId);
    setRemoving(false);
    if (result.success) {
      onOpenChange(false);
      router.refresh();
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Court Block</SheetTitle>
          <SheetDescription>
            {block.courtName} &middot;{" "}
            {formatInTimeZone(block.startTime, timezone, "EEE, MMM d")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <div>
            <p className="text-sm text-muted-foreground">Court</p>
            <p className="font-medium">{block.courtName}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Reason</p>
            <p className="font-medium">{reasonLabels[block.reason] || block.reason}</p>
          </div>

          {block.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm">{block.description}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground">Time</p>
            <p className="font-medium">
              {formatInTimeZone(block.startTime, timezone, "h:mm a")} &ndash;{" "}
              {formatInTimeZone(block.endTime, timezone, "h:mm a")}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatInTimeZone(block.startTime, timezone, "EEE, MMM d yyyy")}
              {formatInTimeZone(block.startTime, timezone, "yyyy-MM-dd") !==
                formatInTimeZone(block.endTime, timezone, "yyyy-MM-dd") &&
                ` \u2013 ${formatInTimeZone(block.endTime, timezone, "EEE, MMM d yyyy")}`}
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" disabled={removing}>
                {removing ? "Removing..." : "Remove Block"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this block?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the {reasonLabels[block.reason]?.toLowerCase() || "block"} on{" "}
                  {block.courtName}. The court will become available for booking.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Block</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
