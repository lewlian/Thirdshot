"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface ConfirmationClientProps {
  isPending: boolean;
  isFailed: boolean;
  bookingId: string;
}

export function ConfirmationClient({ isPending, isFailed, bookingId }: ConfirmationClientProps) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isPending || isFailed) return;

    setTimedOut(false);

    // Auto-refresh every 3 seconds to check payment status
    const interval = setInterval(() => {
      router.refresh();
    }, 3000);

    // Stop after 90 seconds (30 attempts) and show manual retry
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setTimedOut(true);
    }, 90000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isPending, isFailed, router, bookingId]);

  const handleCheckAgain = useCallback(() => {
    setChecking(true);
    setTimedOut(false);
    router.refresh();

    // Resume polling for another 30 seconds
    const interval = setInterval(() => {
      router.refresh();
    }, 3000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setTimedOut(true);
      setChecking(false);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router]);

  if (!isPending || isFailed) return null;

  if (timedOut) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="text-sm text-muted-foreground text-center">
          Payment verification is taking longer than expected. Your payment may still be processing.
        </p>
        <Button
          onClick={handleCheckAgain}
          variant="outline"
          className="rounded-full gap-2"
          disabled={checking}
        >
          <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
          Check Again
        </Button>
      </div>
    );
  }

  return null;
}
