import type { Booking, Court, Payment, User } from "./index";

export interface BookingWithRelations extends Booking {
  courts: Court;
  users: User;
  payments: Payment[] | null;
}

export interface BookingSlotSelection {
  courtId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  slots: number; // Number of consecutive slots (1-3)
}

export interface BookingCreateInput {
  courtId: string;
  startTime: Date;
  endTime: Date;
}

export interface BookingPriceBreakdown {
  slots: {
    startTime: Date;
    endTime: Date;
    isPeak: boolean;
    priceInCents: number;
  }[];
  totalCents: number;
  currency: string;
}
