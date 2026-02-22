/**
 * Unit tests for the inviteSchema validation (members).
 */

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
}));
jest.mock("@/lib/auth/admin", () => ({
  getOrgAdmin: jest.fn(),
}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { inviteSchema } from "@/lib/actions/members";

describe("inviteSchema", () => {
  it("accepts valid email and member role", () => {
    const result = inviteSchema.safeParse({
      email: "test@example.com",
      role: "member",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid email with admin role", () => {
    const result = inviteSchema.safeParse({
      email: "admin@org.com",
      role: "admin",
    });
    expect(result.success).toBe(true);
  });

  it("accepts staff role", () => {
    const result = inviteSchema.safeParse({
      email: "s@t.co",
      role: "staff",
    });
    expect(result.success).toBe(true);
  });

  it("accepts guest role", () => {
    const result = inviteSchema.safeParse({
      email: "g@t.co",
      role: "guest",
    });
    expect(result.success).toBe(true);
  });

  it("rejects owner role", () => {
    const result = inviteSchema.safeParse({
      email: "test@example.com",
      role: "owner",
    });
    expect(result.success).toBe(false);
  });

  it("rejects arbitrary role string", () => {
    const result = inviteSchema.safeParse({
      email: "test@example.com",
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = inviteSchema.safeParse({
      email: "not-an-email",
      role: "member",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = inviteSchema.safeParse({
      email: "",
      role: "member",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional tierId", () => {
    const result = inviteSchema.safeParse({
      email: "test@example.com",
      role: "member",
      tierId: "tier-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tierId).toBe("tier-123");
    }
  });

  it("passes without tierId", () => {
    const result = inviteSchema.safeParse({
      email: "test@example.com",
      role: "member",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tierId).toBeUndefined();
    }
  });
});
