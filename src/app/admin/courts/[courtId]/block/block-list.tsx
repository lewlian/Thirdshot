"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteCourtBlock } from "@/lib/actions/admin";
import { formatInTimeZone } from "date-fns-tz";

const TIMEZONE = "Asia/Singapore";

interface Block {
  id: string;
  start_time: string;
  end_time: string;
  reason: string;
  created_by_id: string;
}

interface BlockListProps {
  blocks: Block[];
}

export function BlockList({ blocks }: BlockListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = (blockId: string) => {
    startTransition(async () => {
      await deleteCourtBlock(blockId);
      router.refresh();
    });
  };

  if (blocks.length === 0) {
    return (
      <p className="text-gray-500 text-center py-4">No active blocks</p>
    );
  }

  return (
    <div className="divide-y">
      {blocks.map((block) => (
        <div
          key={block.id}
          className="py-3 flex justify-between items-start"
        >
          <div>
            <p className="font-medium">
              {formatInTimeZone(block.start_time, TIMEZONE, "EEE, dd MMM yyyy")}
            </p>
            <p className="text-sm text-gray-600">
              {formatInTimeZone(block.start_time, TIMEZONE, "h:mm a")} -{" "}
              {formatInTimeZone(block.end_time, TIMEZONE, "h:mm a")}
            </p>
            {block.reason && (
              <p className="text-sm text-gray-500 mt-1">{block.reason}</p>
            )}
            {/* Creator info would require relation setup */}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleDelete(block.id)}
            disabled={isPending}
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}
