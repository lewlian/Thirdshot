import type { Court } from "@prisma/client";

export interface CourtWithAvailability extends Court {
  availableSlotsToday: number;
  totalSlotsToday: number;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  isPeak: boolean;
  priceInCents: number;
}

export interface CourtAvailability {
  courtId: string;
  date: Date;
  slots: TimeSlot[];
}
