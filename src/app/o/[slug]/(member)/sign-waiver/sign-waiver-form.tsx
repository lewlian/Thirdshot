"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signWaiver } from "@/lib/actions/waivers";

interface SignWaiverFormProps {
  orgId: string;
  waiverId: string;
  slug: string;
}

export function SignWaiverForm({ orgId, waiverId, slug }: SignWaiverFormProps) {
  const [agreed, setAgreed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSign = () => {
    startTransition(async () => {
      const result = await signWaiver(orgId, waiverId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Waiver signed successfully");
        router.push(`/o/${slug}/courts`);
      }
    });
  };

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">
          I have read and agree to the above waiver
        </span>
      </label>

      <Button
        onClick={handleSign}
        disabled={!agreed || isPending}
        className="w-full"
      >
        {isPending ? "Signing..." : "Sign Waiver"}
      </Button>
    </div>
  );
}
