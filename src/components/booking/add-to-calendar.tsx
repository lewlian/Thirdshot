"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddToCalendarProps {
  bookingId: string;
  googleCalendarUrl: string;
}

export function AddToCalendar({ bookingId, googleCalendarUrl }: AddToCalendarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        className="rounded-full h-10 font-medium border-border/60 gap-2"
        onClick={() => setOpen(!open)}
      >
        <Calendar className="h-4 w-4" />
        Add to Calendar
        <ChevronDown className="h-3 w-3" />
      </Button>

      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[180px]">
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
            onClick={() => setOpen(false)}
          >
            Google Calendar
          </a>
          <a
            href={`/api/bookings/${bookingId}/ical`}
            download
            className="block px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
            onClick={() => setOpen(false)}
          >
            Download .ics (Apple/Outlook)
          </a>
        </div>
      )}
    </div>
  );
}
