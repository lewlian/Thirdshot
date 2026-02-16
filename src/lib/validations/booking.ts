import { z } from "zod";

export const createBookingSchema = z.object({
  courtId: z.string().min(1, "Court is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  slots: z
    .number()
    .min(1, "At least 1 slot required")
    .max(3, "Maximum 3 consecutive slots allowed"),
});

export const cancelBookingSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  reason: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
