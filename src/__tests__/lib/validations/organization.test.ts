/**
 * Unit tests for orgSettingsSchema and bookingSettingsSchema.
 */

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
  getUser: jest.fn(),
}));
jest.mock("@/lib/permissions", () => ({
  requireOrgRole: jest.fn(),
  hasMinRole: jest.fn(),
  getUserOrgRole: jest.fn(),
}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import {
  orgSettingsSchema,
  bookingSettingsSchema,
} from "@/lib/actions/organization";

describe("orgSettingsSchema", () => {
  const validSettings = {
    name: "My Club",
    timezone: "Asia/Singapore",
    currency: "SGD",
  };

  it("accepts valid minimal settings", () => {
    const result = orgSettingsSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = orgSettingsSchema.safeParse({ ...validSettings, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    const result = orgSettingsSchema.safeParse({
      ...validSettings,
      name: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid email", () => {
    const result = orgSettingsSchema.safeParse({
      ...validSettings,
      email: "info@club.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for email (allowed by .or(z.literal('')))", () => {
    const result = orgSettingsSchema.safeParse({
      ...validSettings,
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = orgSettingsSchema.safeParse({
      ...validSettings,
      email: "not-email",
    });
    expect(result.success).toBe(false);
  });

  it("requires currency to be exactly 3 chars", () => {
    expect(
      orgSettingsSchema.safeParse({ ...validSettings, currency: "SG" }).success
    ).toBe(false);
    expect(
      orgSettingsSchema.safeParse({ ...validSettings, currency: "SGDD" })
        .success
    ).toBe(false);
    expect(
      orgSettingsSchema.safeParse({ ...validSettings, currency: "USD" }).success
    ).toBe(true);
  });

  it("accepts optional description", () => {
    const result = orgSettingsSchema.safeParse({
      ...validSettings,
      description: "A great club",
    });
    expect(result.success).toBe(true);
  });

  it("rejects description over 500 chars", () => {
    const result = orgSettingsSchema.safeParse({
      ...validSettings,
      description: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for phone", () => {
    const result = orgSettingsSchema.safeParse({
      ...validSettings,
      phone: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for website", () => {
    const result = orgSettingsSchema.safeParse({
      ...validSettings,
      website: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid URL for website", () => {
    const result = orgSettingsSchema.safeParse({
      ...validSettings,
      website: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-URL website string", () => {
    const result = orgSettingsSchema.safeParse({
      ...validSettings,
      website: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("bookingSettingsSchema", () => {
  const valid = {
    booking_window_days: 14,
    slot_duration_minutes: 60,
    max_consecutive_slots: 3,
    payment_timeout_minutes: 15,
    allow_guest_bookings: true,
  };

  it("accepts valid booking settings", () => {
    expect(bookingSettingsSchema.safeParse(valid).success).toBe(true);
  });

  // booking_window_days: 1-90
  it("rejects booking_window_days < 1", () => {
    expect(
      bookingSettingsSchema.safeParse({ ...valid, booking_window_days: 0 })
        .success
    ).toBe(false);
  });
  it("rejects booking_window_days > 90", () => {
    expect(
      bookingSettingsSchema.safeParse({ ...valid, booking_window_days: 91 })
        .success
    ).toBe(false);
  });

  // slot_duration_minutes: 15-120
  it("rejects slot_duration_minutes < 15", () => {
    expect(
      bookingSettingsSchema.safeParse({ ...valid, slot_duration_minutes: 14 })
        .success
    ).toBe(false);
  });
  it("accepts slot_duration_minutes = 15", () => {
    expect(
      bookingSettingsSchema.safeParse({ ...valid, slot_duration_minutes: 15 })
        .success
    ).toBe(true);
  });
  it("rejects slot_duration_minutes > 120", () => {
    expect(
      bookingSettingsSchema.safeParse({ ...valid, slot_duration_minutes: 121 })
        .success
    ).toBe(false);
  });

  // max_consecutive_slots: 1-8
  it("rejects max_consecutive_slots < 1", () => {
    expect(
      bookingSettingsSchema.safeParse({ ...valid, max_consecutive_slots: 0 })
        .success
    ).toBe(false);
  });
  it("rejects max_consecutive_slots > 8", () => {
    expect(
      bookingSettingsSchema.safeParse({ ...valid, max_consecutive_slots: 9 })
        .success
    ).toBe(false);
  });

  // payment_timeout_minutes: 5-60
  it("rejects payment_timeout_minutes < 5", () => {
    expect(
      bookingSettingsSchema.safeParse({ ...valid, payment_timeout_minutes: 4 })
        .success
    ).toBe(false);
  });
  it("rejects payment_timeout_minutes > 60", () => {
    expect(
      bookingSettingsSchema.safeParse({ ...valid, payment_timeout_minutes: 61 })
        .success
    ).toBe(false);
  });

  // allow_guest_bookings: boolean
  it("accepts allow_guest_bookings = false", () => {
    expect(
      bookingSettingsSchema.safeParse({ ...valid, allow_guest_bookings: false })
        .success
    ).toBe(true);
  });
  it("rejects non-boolean allow_guest_bookings", () => {
    expect(
      bookingSettingsSchema.safeParse({
        ...valid,
        allow_guest_bookings: "yes",
      }).success
    ).toBe(false);
  });
});
