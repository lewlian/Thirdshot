"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookingStatusFilterProps {
  currentStatus?: string;
}

export function BookingStatusFilter({ currentStatus }: BookingStatusFilterProps) {
  const router = useRouter();

  const handleChange = (value: string) => {
    if (value === "all") {
      router.push("/admin/bookings");
    } else {
      router.push(`/admin/bookings?status=${value}`);
    }
  };

  return (
    <Select value={currentStatus || "all"} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="confirmed">Confirmed</SelectItem>
        <SelectItem value="pending_payment">Pending Payment</SelectItem>
        <SelectItem value="cancelled">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  );
}
