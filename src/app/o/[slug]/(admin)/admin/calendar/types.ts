export interface CalendarCourt {
  id: string;
  name: string;
  sort_order: number;
}

export interface CalendarBooking {
  bookingId: string;
  courtId: string;
  courtName: string;
  userName: string;
  userEmail: string;
  status: "PENDING_PAYMENT" | "CONFIRMED" | "COMPLETED" | "NO_SHOW";
  isAdminOverride: boolean;
  adminNotes: string | null;
  totalCents: number;
  currency: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
}

export interface CalendarBlock {
  id: string;
  courtId: string;
  courtName: string;
  reason: "MAINTENANCE" | "TOURNAMENT" | "PRIVATE_EVENT" | "OTHER";
  description: string | null;
  startTime: string; // ISO string
  endTime: string; // ISO string
}

export interface CalendarData {
  courts: CalendarCourt[];
  bookings: CalendarBooking[];
  blocks: CalendarBlock[];
  weekStart: string; // ISO date string (Monday)
  weekEnd: string; // ISO date string (Sunday end)
  timezone: string;
  orgId: string;
  orgSlug: string;
}
