/**
 * Unit tests for admin server actions (courts, court blocks, bookings).
 */

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock("@/lib/auth/admin", () => ({
  getAdminUser: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import {
  createCourt,
  updateCourt,
  deleteCourt,
  createCourtBlock,
  deleteCourtBlock,
  adminCancelBooking,
} from "@/lib/actions/admin";
import { getAdminUser } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createChain } from "@/__tests__/helpers/supabase-mock";

const ORG_ID = "org-1";
const ADMIN_ID = "admin-user";
const COURT_ID = "court-1";
const BLOCK_ID = "block-1";
const BOOKING_ID = "booking-1";

function mockAdmin(user: { id: string } | null) {
  (getAdminUser as jest.Mock).mockResolvedValue(user);
}

function buildMock(tableResponses: Record<string, any>) {
  const insertSpy = jest.fn();
  const mock = {
    from: jest.fn((table: string) => {
      const chain = createChain(
        tableResponses[table] || { data: null, error: null }
      );
      // Wrap insert to capture the payload
      const origInsert = chain.insert;
      chain.insert = jest.fn((...args: any[]) => {
        insertSpy(table, ...args);
        return origInsert(...args);
      });
      return chain;
    }),
    rpc: jest.fn(),
    auth: { getUser: jest.fn() },
  };
  (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);
  return { mock, insertSpy };
}

function makeCourtFormData(overrides?: Record<string, string>) {
  const fd = new FormData();
  fd.set("orgId", ORG_ID);
  fd.set("name", "Court A");
  fd.set("description", "Indoor court");
  fd.set("pricePerHour", "20.00");
  fd.set("isActive", "true");
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      fd.set(k, v);
    }
  }
  return fd;
}

function makeBlockFormData(overrides?: Record<string, string>) {
  const fd = new FormData();
  fd.set("orgId", ORG_ID);
  fd.set("courtId", COURT_ID);
  fd.set("startTime", "2026-03-01T09:00:00");
  fd.set("endTime", "2026-03-01T11:00:00");
  fd.set("reason", "MAINTENANCE");
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      fd.set(k, v);
    }
  }
  return fd;
}

// ──────────────── createCourt ────────────────

describe("createCourt", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockAdmin(null);
    const result = await createCourt(makeCourtFormData());
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("returns error when orgId is missing", async () => {
    mockAdmin({ id: ADMIN_ID });
    const fd = makeCourtFormData();
    fd.delete("orgId");
    const result = await createCourt(fd);
    expect(result).toEqual({
      success: false,
      error: "Organization ID is required",
    });
  });

  it("returns validation error for empty name", async () => {
    mockAdmin({ id: ADMIN_ID });
    const fd = makeCourtFormData({ name: "" });
    const result = await createCourt(fd);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Name is required/i);
  });

  it("inserts court with id field (crypto.randomUUID)", async () => {
    mockAdmin({ id: ADMIN_ID });
    const { insertSpy } = buildMock({
      courts: {
        data: { id: "new-court-id", name: "Court A" },
        error: null,
      },
      admin_audit_logs: { data: null, error: null },
    });

    const result = await createCourt(makeCourtFormData());
    expect(result.success).toBe(true);

    // Verify that the courts insert includes an `id` field
    const courtsInsertCall = insertSpy.mock.calls.find(
      ([table]: [string]) => table === "courts"
    );
    expect(courtsInsertCall).toBeDefined();
    const insertPayload = courtsInsertCall![1];
    expect(insertPayload).toHaveProperty("id");
    expect(typeof insertPayload.id).toBe("string");
    expect(insertPayload.id.length).toBeGreaterThan(0);
    expect(insertPayload.organization_id).toBe(ORG_ID);
    expect(insertPayload.name).toBe("Court A");
    expect(insertPayload.price_per_hour_cents).toBe(2000);
  });

  it("returns error when Supabase insert fails", async () => {
    mockAdmin({ id: ADMIN_ID });
    buildMock({
      courts: { data: null, error: { message: "DB error" } },
    });
    const result = await createCourt(makeCourtFormData());
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to create court");
  });
});

// ──────────────── createCourtBlock ────────────────

describe("createCourtBlock", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockAdmin(null);
    const result = await createCourtBlock(makeBlockFormData());
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("returns error when end time is before start time", async () => {
    mockAdmin({ id: ADMIN_ID });
    const fd = makeBlockFormData({
      startTime: "2026-03-01T11:00:00",
      endTime: "2026-03-01T09:00:00",
    });
    const result = await createCourtBlock(fd);
    expect(result).toEqual({
      success: false,
      error: "End time must be after start time",
    });
  });

  it("inserts block with id field", async () => {
    mockAdmin({ id: ADMIN_ID });
    const { insertSpy } = buildMock({
      booking_slots: { data: [], error: null },
      court_blocks: {
        data: { id: "new-block-id", court_id: COURT_ID },
        error: null,
      },
      admin_audit_logs: { data: null, error: null },
    });

    const result = await createCourtBlock(makeBlockFormData());
    expect(result.success).toBe(true);

    const blockInsertCall = insertSpy.mock.calls.find(
      ([table]: [string]) => table === "court_blocks"
    );
    expect(blockInsertCall).toBeDefined();
    const insertPayload = blockInsertCall![1];
    expect(insertPayload).toHaveProperty("id");
    expect(typeof insertPayload.id).toBe("string");
    expect(insertPayload.id.length).toBeGreaterThan(0);
    expect(insertPayload.organization_id).toBe(ORG_ID);
    expect(insertPayload.reason).toBe("MAINTENANCE");
  });

  it("returns error when there are conflicting bookings", async () => {
    mockAdmin({ id: ADMIN_ID });
    buildMock({
      booking_slots: {
        data: [{ id: "slot-1" }],
        error: null,
      },
    });
    const result = await createCourtBlock(makeBlockFormData());
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/existing bookings/i);
  });
});

// ──────────────── audit log ────────────────

describe("createAuditLog (via createCourt)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("audit log insert includes id field", async () => {
    mockAdmin({ id: ADMIN_ID });
    const { insertSpy } = buildMock({
      courts: {
        data: { id: "new-court-id", name: "Court A" },
        error: null,
      },
      admin_audit_logs: { data: null, error: null },
    });

    await createCourt(makeCourtFormData());

    const auditInsertCall = insertSpy.mock.calls.find(
      ([table]: [string]) => table === "admin_audit_logs"
    );
    expect(auditInsertCall).toBeDefined();
    const payload = auditInsertCall![1];
    expect(payload).toHaveProperty("id");
    expect(typeof payload.id).toBe("string");
    expect(payload.id.length).toBeGreaterThan(0);
  });
});

// ──────────────── adminCancelBooking ────────────────

describe("adminCancelBooking", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockAdmin(null);
    const result = await adminCancelBooking(BOOKING_ID);
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("cancels booking successfully", async () => {
    mockAdmin({ id: ADMIN_ID });
    buildMock({
      bookings: {
        data: {
          id: BOOKING_ID,
          user_id: "user-1",
          organization_id: ORG_ID,
          booking_slots: [{ id: "slot-1" }],
        },
        error: null,
      },
      admin_audit_logs: { data: null, error: null },
    });

    const result = await adminCancelBooking(BOOKING_ID, "Test cancel", ORG_ID);
    expect(result.success).toBe(true);
  });
});

// ──────────────── deleteCourtBlock ────────────────

describe("deleteCourtBlock", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockAdmin(null);
    const result = await deleteCourtBlock(BLOCK_ID, ORG_ID);
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("deletes block successfully", async () => {
    mockAdmin({ id: ADMIN_ID });
    buildMock({
      court_blocks: {
        data: { id: BLOCK_ID, court_id: COURT_ID },
        error: null,
      },
      admin_audit_logs: { data: null, error: null },
    });

    const result = await deleteCourtBlock(BLOCK_ID, ORG_ID);
    expect(result.success).toBe(true);
  });
});

// ──────────────── deleteCourt ────────────────

describe("deleteCourt", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockAdmin(null);
    const result = await deleteCourt(COURT_ID, ORG_ID);
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("blocks deletion when active bookings exist", async () => {
    mockAdmin({ id: ADMIN_ID });
    buildMock({
      booking_slots: { data: null, error: null, count: 3 },
    });

    const result = await deleteCourt(COURT_ID, ORG_ID);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Cannot delete court/);
  });
});
