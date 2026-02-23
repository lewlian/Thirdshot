"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeekNavigationProps {
  weekStart: string; // YYYY-MM-DD
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} \u2013 ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} \u2013 ${endMonth} ${endDay}, ${year}`;
}

function shiftWeek(weekStart: string, delta: number): string {
  const d = new Date(weekStart + "T12:00:00");
  d.setDate(d.getDate() + delta * 7);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getTodayWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

export function WeekNavigation({ weekStart }: WeekNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentWeekStart = getTodayWeekStart();
  const isCurrentWeek = weekStart === currentWeekStart;

  function navigate(newWeek: string) {
    router.push(`${pathname}?week=${newWeek}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate(shiftWeek(weekStart, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate(shiftWeek(weekStart, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <span className="text-sm font-medium">{formatWeekRange(weekStart)}</span>
      {!isCurrentWeek && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => navigate(currentWeekStart)}
        >
          This Week
        </Button>
      )}
    </div>
  );
}
