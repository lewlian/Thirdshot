/**
 * Unit tests for the guest booking POST handler.
 */

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
}));
jest.mock("next/server", () => {
  return {
    NextRequest: jest.fn(),
    NextResponse: {
      json: (body: any, init?: any) =>
        ({
          status: init?.status || 200,
          json: async () => body,
        }),
    },
  };
});

import { POST } from "@/app/api/guest-booking/route";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createChain } from "@/__tests__/helpers/supabase-mock";

// Mock crypto.randomUUID
const MOCK_UUID = "00000000-0000-0000-0000-000000000001";
let uuidCounter = 0;
const origRandomUUID = crypto.randomUUID;
beforeAll(() => {
  crypto.randomUUID = jest.fn(
    () => `${MOCK_UUID.slice(0, -1)}${uuidCounter++}` as `${string}-${string}-${string}-${string}-${string}`
  );
});
afterAll(() => {
  crypto.randomUUID = origRandomUUID;
});

function makeRequest(body: unknown) {
  return {
    json: async () => body,
  } as any;
}

const validBody = {
  orgId: "org-1",
  guestName: "Alice",
  guestEmail: "alice@example.com",
  slots: [
    {
      courtId: "court-1",
      startTime: "2025-06-01T10:00:00Z",
      endTime: "2025-06-01T11:00:00Z",
      priceInCents: 2000,
    },
  ],
};

describe("POST /api/guest-booking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    uuidCounter = 0;
  });

  it("returns 400 on invalid body (missing orgId)", async () => {
    const res = await POST(makeRequest({ guestName: "X" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 on invalid body (empty object)", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid email", async () => {
    const res = await POST(
      makeRequest({ ...validBody, guestEmail: "not-email" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when guest bookings disabled", async () => {
    const tableResponses: Record<string, Record<number, any>> = {};
    const callCounts: Record<string, number> = {};

    function getResponse(table: string) {
      if (table === "organizations") {
        return {
          data: { id: "org-1", allow_guest_bookings: false, payment_timeout_minutes: 15 },
          error: null,
        };
      }
      return { data: null, error: null };
    }

    const mock = {
      from: jest.fn((table: string) => createChain(getResponse(table))),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("Guest bookings are not allowed");
  });

  it("returns 403 when org not found", async () => {
    const mock = {
      from: jest.fn(() => createChain({ data: null, error: null })),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  it("returns 409 on slot conflict", async () => {
    const callCounts: Record<string, number> = {};

    function getResponse(table: string) {
      callCounts[table] = (callCounts[table] || 0) + 1;

      if (table === "organizations") {
        return {
          data: { id: "org-1", allow_guest_bookings: true, payment_timeout_minutes: 15 },
          error: null,
        };
      }
      if (table === "guests") {
        return { data: { id: "guest-1" }, error: null }; // existing guest
      }
      if (table === "booking_slots") {
        // Return count > 0 to signal conflict
        return { data: null, count: 1, error: null };
      }
      return { data: null, error: null };
    }

    const mock = {
      from: jest.fn((table: string) => createChain(getResponse(table))),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("no longer available");
  });

  it("reuses existing guest by email", async () => {
    const callCounts: Record<string, number> = {};

    function getResponse(table: string) {
      callCounts[table] = (callCounts[table] || 0) + 1;

      if (table === "organizations") {
        return {
          data: { id: "org-1", allow_guest_bookings: true, payment_timeout_minutes: 15 },
          error: null,
        };
      }
      if (table === "guests") {
        if (callCounts[table] === 1) {
          // First call: find existing guest
          return { data: { id: "existing-guest-id" }, error: null };
        }
        if (callCounts[table] === 2) {
          // Second call: get converted_to_user_id
          return { data: { converted_to_user_id: null }, error: null };
        }
        // Third call: update guest
        return { data: { total_bookings: 3 }, error: null };
      }
      if (table === "booking_slots") {
        // Check: count is 0 (available)
        return { data: null, count: 0, error: null };
      }
      if (table === "bookings") {
        return { data: null, error: null };
      }
      if (table === "payments") {
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }

    const mock = {
      from: jest.fn((table: string) => createChain(getResponse(table))),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.bookingId).toBeDefined();
  });

  it("creates PENDING_PAYMENT booking with correct total", async () => {
    const twoSlotBody = {
      ...validBody,
      slots: [
        { courtId: "c1", startTime: "2025-06-01T10:00:00Z", endTime: "2025-06-01T11:00:00Z", priceInCents: 2000 },
        { courtId: "c2", startTime: "2025-06-01T11:00:00Z", endTime: "2025-06-01T12:00:00Z", priceInCents: 3000 },
      ],
    };

    const insertCalls: any[] = [];
    const callCounts: Record<string, number> = {};

    function getResponse(table: string) {
      callCounts[table] = (callCounts[table] || 0) + 1;

      if (table === "organizations") {
        return {
          data: { id: "org-1", allow_guest_bookings: true, payment_timeout_minutes: 15 },
          error: null,
        };
      }
      if (table === "guests") {
        if (callCounts[table] === 1) return { data: { id: "g1" }, error: null };
        if (callCounts[table] === 2) return { data: { converted_to_user_id: null }, error: null };
        return { data: { total_bookings: 0 }, error: null };
      }
      if (table === "booking_slots") {
        return { data: null, count: 0, error: null };
      }
      return { data: null, error: null };
    }

    // Build a mock that captures insert calls
    const mock = {
      from: jest.fn((table: string) => {
        const chain = createChain(getResponse(table));
        const origInsert = chain.insert;
        chain.insert = jest.fn((data: any) => {
          insertCalls.push({ table, data });
          return origInsert(data);
        });
        return chain;
      }),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const res = await POST(makeRequest(twoSlotBody));
    expect(res.status).toBe(200);

    // Find the booking insert
    const bookingInsert = insertCalls.find((c) => c.table === "bookings");
    expect(bookingInsert).toBeDefined();
    expect(bookingInsert.data.total_cents).toBe(5000);
    expect(bookingInsert.data.status).toBe("PENDING_PAYMENT");

    // Check payment insert
    const paymentInsert = insertCalls.find((c) => c.table === "payments");
    expect(paymentInsert).toBeDefined();
    expect(paymentInsert.data.amount_cents).toBe(5000);
  });

  it("sets expires_at based on payment_timeout_minutes", async () => {
    const callCounts: Record<string, number> = {};
    const insertCalls: any[] = [];

    function getResponse(table: string) {
      callCounts[table] = (callCounts[table] || 0) + 1;
      if (table === "organizations") {
        return {
          data: { id: "org-1", allow_guest_bookings: true, payment_timeout_minutes: 30 },
          error: null,
        };
      }
      if (table === "guests") {
        if (callCounts[table] === 1) return { data: { id: "g1" }, error: null };
        if (callCounts[table] === 2) return { data: { converted_to_user_id: null }, error: null };
        return { data: { total_bookings: 0 }, error: null };
      }
      if (table === "booking_slots") return { data: null, count: 0, error: null };
      return { data: null, error: null };
    }

    const mock = {
      from: jest.fn((table: string) => {
        const chain = createChain(getResponse(table));
        const origInsert = chain.insert;
        chain.insert = jest.fn((data: any) => {
          insertCalls.push({ table, data });
          return origInsert(data);
        });
        return chain;
      }),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const before = Date.now();
    const res = await POST(makeRequest(validBody));
    const after = Date.now();

    expect(res.status).toBe(200);

    const bookingInsert = insertCalls.find((c) => c.table === "bookings");
    const expiresAt = new Date(bookingInsert.data.expires_at).getTime();
    const thirtyMin = 30 * 60 * 1000;
    expect(expiresAt).toBeGreaterThanOrEqual(before + thirtyMin - 1000);
    expect(expiresAt).toBeLessThanOrEqual(after + thirtyMin + 1000);
  });

  it("returns 500 and cleans up on slot insertion failure", async () => {
    const callCounts: Record<string, number> = {};
    const deleteCalls: string[] = [];

    function getResponse(table: string) {
      callCounts[table] = (callCounts[table] || 0) + 1;
      if (table === "organizations") {
        return {
          data: { id: "org-1", allow_guest_bookings: true, payment_timeout_minutes: 15 },
          error: null,
        };
      }
      if (table === "guests") {
        if (callCounts[table] === 1) return { data: { id: "g1" }, error: null };
        if (callCounts[table] === 2) return { data: { converted_to_user_id: null }, error: null };
        return { data: { total_bookings: 0 }, error: null };
      }
      // booking_slots availability check: available
      if (table === "booking_slots" && callCounts[table] === 1) {
        return { data: null, count: 0, error: null };
      }
      // booking_slots insert: ERROR
      if (table === "booking_slots" && callCounts[table] === 2) {
        return { data: null, error: { message: "Insert failed" } };
      }
      if (table === "bookings" && callCounts[table] === 1) {
        return { data: null, error: null }; // insert OK
      }
      return { data: null, error: null };
    }

    const mock = {
      from: jest.fn((table: string) => {
        const chain = createChain(getResponse(table));
        const origDelete = chain.delete;
        chain.delete = jest.fn(() => {
          deleteCalls.push(table);
          return origDelete();
        });
        return chain;
      }),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("booking slots");

    // Verify cleanup: booking should be deleted
    expect(deleteCalls).toContain("bookings");
  });
});
