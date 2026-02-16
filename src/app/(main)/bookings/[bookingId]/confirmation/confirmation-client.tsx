"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ConfirmationClientProps {
  isPending: boolean;
  isFailed: boolean;
  bookingId: string;
}

export function ConfirmationClient({ isPending, isFailed, bookingId }: ConfirmationClientProps) {
  const router = useRouter();

  useEffect(() => {
    // Stop refreshing if payment is no longer pending or if it failed
    if (!isPending || isFailed) return;

    // Auto-refresh every 3 seconds to check payment status
    const interval = setInterval(() => {
      router.refresh();
    }, 3000);

    // Stop after 30 seconds (10 attempts)
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isPending, isFailed, router, bookingId]);

  return null;
}
