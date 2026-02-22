/**
 * Unit tests for createOrgSchema validation.
 */

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
  getUser: jest.fn(),
}));
jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: jest.fn((body: any, init?: any) => ({ body, status: init?.status || 200 })) },
}));

import { createOrgSchema } from "@/app/api/create-org/route";

describe("createOrgSchema", () => {
  const validInput = {
    name: "My Club",
    slug: "my-club",
    courts: [{ name: "Court 1", hourlyRate: 20 }],
  };

  // Name
  it("accepts valid name", () => {
    expect(createOrgSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, name: "" }).success
    ).toBe(false);
  });

  it("rejects name over 100 chars", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, name: "x".repeat(101) })
        .success
    ).toBe(false);
  });

  // Slug
  it("accepts lowercase slug with hyphens", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, slug: "my-cool-club" })
        .success
    ).toBe(true);
  });

  it("accepts slug with numbers", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, slug: "club-123" }).success
    ).toBe(true);
  });

  it("rejects uppercase slug", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, slug: "My-Club" }).success
    ).toBe(false);
  });

  it("rejects slug with spaces", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, slug: "my club" }).success
    ).toBe(false);
  });

  it("rejects slug with special characters", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, slug: "my_club!" }).success
    ).toBe(false);
  });

  it("rejects empty slug", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, slug: "" }).success
    ).toBe(false);
  });

  it("rejects slug over 50 chars", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, slug: "a".repeat(51) })
        .success
    ).toBe(false);
  });

  // Defaults
  it("defaults country to SG", () => {
    const result = createOrgSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.country).toBe("SG");
    }
  });

  it("defaults timezone to Asia/Singapore", () => {
    const result = createOrgSchema.safeParse(validInput);
    if (result.success) {
      expect(result.data.timezone).toBe("Asia/Singapore");
    }
  });

  it("defaults currency to SGD", () => {
    const result = createOrgSchema.safeParse(validInput);
    if (result.success) {
      expect(result.data.currency).toBe("SGD");
    }
  });

  it("defaults primaryColor to #16a34a", () => {
    const result = createOrgSchema.safeParse(validInput);
    if (result.success) {
      expect(result.data.primaryColor).toBe("#16a34a");
    }
  });

  it("defaults bookingWindowDays to 14", () => {
    const result = createOrgSchema.safeParse(validInput);
    if (result.success) {
      expect(result.data.bookingWindowDays).toBe(14);
    }
  });

  it("defaults slotDurationMinutes to 60", () => {
    const result = createOrgSchema.safeParse(validInput);
    if (result.success) {
      expect(result.data.slotDurationMinutes).toBe(60);
    }
  });

  it("defaults maxConsecutiveSlots to 3", () => {
    const result = createOrgSchema.safeParse(validInput);
    if (result.success) {
      expect(result.data.maxConsecutiveSlots).toBe(3);
    }
  });

  it("defaults paymentTimeoutMinutes to 15", () => {
    const result = createOrgSchema.safeParse(validInput);
    if (result.success) {
      expect(result.data.paymentTimeoutMinutes).toBe(15);
    }
  });

  it("defaults allowGuestBookings to true", () => {
    const result = createOrgSchema.safeParse(validInput);
    if (result.success) {
      expect(result.data.allowGuestBookings).toBe(true);
    }
  });

  // Numeric ranges
  it("rejects bookingWindowDays > 90", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, bookingWindowDays: 91 })
        .success
    ).toBe(false);
  });

  it("rejects bookingWindowDays < 1", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, bookingWindowDays: 0 })
        .success
    ).toBe(false);
  });

  it("rejects slotDurationMinutes < 15", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, slotDurationMinutes: 10 })
        .success
    ).toBe(false);
  });

  it("rejects slotDurationMinutes > 180", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, slotDurationMinutes: 181 })
        .success
    ).toBe(false);
  });

  it("rejects maxConsecutiveSlots > 10", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, maxConsecutiveSlots: 11 })
        .success
    ).toBe(false);
  });

  it("rejects paymentTimeoutMinutes < 5", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, paymentTimeoutMinutes: 4 })
        .success
    ).toBe(false);
  });

  it("rejects paymentTimeoutMinutes > 60", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, paymentTimeoutMinutes: 61 })
        .success
    ).toBe(false);
  });

  // Courts
  it("requires at least 1 court", () => {
    expect(
      createOrgSchema.safeParse({ ...validInput, courts: [] }).success
    ).toBe(false);
  });

  it("rejects court without name", () => {
    expect(
      createOrgSchema.safeParse({
        ...validInput,
        courts: [{ name: "", hourlyRate: 20 }],
      }).success
    ).toBe(false);
  });

  it("accepts multiple courts", () => {
    const result = createOrgSchema.safeParse({
      ...validInput,
      courts: [
        { name: "Court 1", hourlyRate: 20 },
        { name: "Court 2", hourlyRate: 25 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects court with negative hourlyRate", () => {
    expect(
      createOrgSchema.safeParse({
        ...validInput,
        courts: [{ name: "Court 1", hourlyRate: -5 }],
      }).success
    ).toBe(false);
  });

  // Email
  it("accepts empty string for email", () => {
    const result = createOrgSchema.safeParse({
      ...validInput,
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid email", () => {
    const result = createOrgSchema.safeParse({
      ...validInput,
      email: "info@club.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = createOrgSchema.safeParse({
      ...validInput,
      email: "bad-email",
    });
    expect(result.success).toBe(false);
  });
});
