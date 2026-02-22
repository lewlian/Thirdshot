/**
 * Unit tests for the guestBookingSchema validation.
 */

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
}));
jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: jest.fn((body: any, init?: any) => ({ body, status: init?.status || 200 })) },
}));

import { guestBookingSchema } from "@/app/api/guest-booking/route";

describe("guestBookingSchema", () => {
  const validSlot = {
    courtId: "court-1",
    startTime: "2025-06-01T10:00:00Z",
    endTime: "2025-06-01T11:00:00Z",
    priceInCents: 2000,
  };

  const validBody = {
    orgId: "org-1",
    guestName: "Alice",
    guestEmail: "alice@example.com",
    slots: [validSlot],
  };

  it("accepts a valid single-slot booking", () => {
    expect(guestBookingSchema.safeParse(validBody).success).toBe(true);
  });

  it("accepts multiple slots", () => {
    const body = {
      ...validBody,
      slots: [
        validSlot,
        { ...validSlot, courtId: "court-2", priceInCents: 3000 },
      ],
    };
    expect(guestBookingSchema.safeParse(body).success).toBe(true);
  });

  it("accepts null phone", () => {
    const body = { ...validBody, guestPhone: null };
    expect(guestBookingSchema.safeParse(body).success).toBe(true);
  });

  it("accepts phone string", () => {
    const body = { ...validBody, guestPhone: "+65 9123 4567" };
    expect(guestBookingSchema.safeParse(body).success).toBe(true);
  });

  it("passes without guestPhone (optional)", () => {
    const result = guestBookingSchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  it("rejects empty orgId", () => {
    expect(
      guestBookingSchema.safeParse({ ...validBody, orgId: "" }).success
    ).toBe(false);
  });

  it("rejects empty guestName", () => {
    expect(
      guestBookingSchema.safeParse({ ...validBody, guestName: "" }).success
    ).toBe(false);
  });

  it("rejects empty guestEmail", () => {
    expect(
      guestBookingSchema.safeParse({ ...validBody, guestEmail: "" }).success
    ).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(
      guestBookingSchema.safeParse({
        ...validBody,
        guestEmail: "not-email",
      }).success
    ).toBe(false);
  });

  it("rejects empty slots array", () => {
    expect(
      guestBookingSchema.safeParse({ ...validBody, slots: [] }).success
    ).toBe(false);
  });

  it("rejects slot missing courtId", () => {
    const bad = { startTime: "t", endTime: "t", priceInCents: 100 };
    expect(
      guestBookingSchema.safeParse({ ...validBody, slots: [bad] }).success
    ).toBe(false);
  });

  it("rejects slot missing startTime", () => {
    const bad = { courtId: "c", endTime: "t", priceInCents: 100 };
    expect(
      guestBookingSchema.safeParse({ ...validBody, slots: [bad] }).success
    ).toBe(false);
  });

  it("rejects slot missing endTime", () => {
    const bad = { courtId: "c", startTime: "t", priceInCents: 100 };
    expect(
      guestBookingSchema.safeParse({ ...validBody, slots: [bad] }).success
    ).toBe(false);
  });

  it("rejects non-number priceInCents", () => {
    const bad = {
      courtId: "c",
      startTime: "t",
      endTime: "t",
      priceInCents: "2000",
    };
    expect(
      guestBookingSchema.safeParse({ ...validBody, slots: [bad] }).success
    ).toBe(false);
  });

  it("rejects empty object", () => {
    expect(guestBookingSchema.safeParse({}).success).toBe(false);
  });

  it("rejects missing slots field", () => {
    const { slots: _, ...noSlots } = validBody;
    expect(guestBookingSchema.safeParse(noSlots).success).toBe(false);
  });
});
