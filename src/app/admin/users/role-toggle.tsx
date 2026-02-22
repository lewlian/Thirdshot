"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserRole } from "@/lib/actions/admin";

interface UserRoleToggleProps {
  userId: string;
  role: "USER" | "ADMIN";
  orgId: string;
}

export function UserRoleToggle({ userId, role, orgId }: UserRoleToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (newRole: "USER" | "ADMIN") => {
    if (newRole === role) return;

    startTransition(async () => {
      const result = await updateUserRole(userId, newRole, orgId);
      if (!result.success) {
        alert(result.error);
      }
      router.refresh();
    });
  };

  return (
    <Select
      value={role}
      onValueChange={(value) => handleChange(value as "USER" | "ADMIN")}
      disabled={isPending}
    >
      <SelectTrigger className="w-[100px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USER">User</SelectItem>
        <SelectItem value="ADMIN">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}
