/**
 * Unit tests for recurring booking server actions.
 */

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  requireOrgRole: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import {
  createRecurringBooking,
  cancelRecurringBooking,
  getRecurringBookings,
} from "@/lib/actions/recurring-bookings";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions";
import { createChain } from "@/__tests__/helpers/supabase-mock";

const ORG_ID = "org-1";
const USER_ID = "user-1";
const COURT_ID = "court-1";
const RECURRING_ID = "recurring-1";

describe("createRecurringBooking", () => {
  beforeEach(() => jest.clearAllMocks());

  function makeFormData(overrides: Record<string, string> = {}): FormData {
    const fd = new FormData();
    fd.set("courtId", overrides.courtId ?? COURT_ID);
    fd.set("title", overrides.title ?? "Tuesday Coaching");
    fd.set("dayOfWeek", overrides.dayOfWeek ?? "2"); // Tuesday
    fd.set("startTime", overrides.startTime ?? "19:00");
    fd.set("endTime", overrides.endTime ?? "20:00");
    fd.set("startsOn", overrides.startsOn ?? "2026-03-03");
    fd.set("endsOn", overrides.endsOn ?? "2026-03-17"); // 3 Tuesdays: 3rd, 10th, 17th
    if (overrides.notes) fd.set("notes", overrides.notes);
    return fd;
  }

  it("returns validation error for missing court", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });

    const fd = makeFormData({ courtId: "" });
    const result = await createRecurringBooking(ORG_ID, fd);
    expect(result).toEqual({ error: "Court is required" });
  });

  it("returns validation error for missing title", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });

    const fd = makeFormData({ title: "" });
    const result = await createRecurringBooking(ORG_ID, fd);
    expect(result).toEqual({ error: "Title is required" });
  });

  it("returns validation error for invalid time format", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });

    const fd = makeFormData({ startTime: "9am" });
    const result = await createRecurringBooking(ORG_ID, fd);
    expect(result).toEqual({ error: "Invalid time format" });
  });

  it("returns error when end date is before start date", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });

    const fd = makeFormData({ startsOn: "2026-03-17", endsOn: "2026-03-03" });
    const result = await createRecurringBooking(ORG_ID, fd);
    expect(result).toEqual({ error: "End date must be after start date" });
  });

  it("returns error when end time is before start time", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });

    const fd = makeFormData({ startTime: "20:00", endTime: "19:00" });
    const result = await createRecurringBooking(ORG_ID, fd);
    expect(result).toEqual({ error: "End time must be after start time" });
  });

  it("returns error when court not found", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });

    const callCount = { n: 0 };
    const responses: any[] = [
      { data: null, error: null }, // court not found
    ];

    const mock = {
      from: jest.fn(() => {
        const idx = callCount.n++;
        return createChain(responses[idx] || { data: null, error: null });
      }),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const result = await createRecurringBooking(ORG_ID, makeFormData());
    expect(result).toEqual({ error: "Court not found" });
  });

  it("creates bookings successfully with no conflicts", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });

    const callCount = { n: 0 };
    const responses: any[] = [
      { data: { id: COURT_ID, name: "Court 1", organization_id: ORG_ID }, error: null }, // court
      { data: { timezone: "Asia/Singapore" }, error: null }, // org
      { data: null, error: null }, // recurring_bookings insert
      { data: [], error: null },   // conflict check #1
      { data: null, error: null }, // bookings insert #1
      { data: null, error: null }, // booking_slots insert #1
      { data: [], error: null },   // conflict check #2
      { data: null, error: null }, // bookings insert #2
      { data: null, error: null }, // booking_slots insert #2
      { data: [], error: null },   // conflict check #3
      { data: null, error: null }, // bookings insert #3
      { data: null, error: null }, // booking_slots insert #3
      { data: null, error: null }, // audit log
    ];

    const mock = {
      from: jest.fn(() => {
        const idx = callCount.n++;
        return createChain(responses[idx] || { data: null, error: null });
      }),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const result = await createRecurringBooking(ORG_ID, makeFormData());
    expect(result.success).toBe(true);
    expect(result.message).toContain("Created 3 bookings");
  });

  it("reports skipped bookings due to conflicts", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });

    const callCount = { n: 0 };
    const responses: any[] = [
      { data: { id: COURT_ID, name: "Court 1", organization_id: ORG_ID }, error: null }, // court
      { data: { timezone: "Asia/Singapore" }, error: null }, // org
      { data: null, error: null }, // recurring_bookings insert
      { data: [{ id: "conflict-1" }], error: null }, // conflict check #1 — has conflict
      { data: [], error: null },   // conflict check #2 — no conflict
      { data: null, error: null }, // bookings insert #2
      { data: null, error: null }, // booking_slots insert #2
      { data: [], error: null },   // conflict check #3 — no conflict
      { data: null, error: null }, // bookings insert #3
      { data: null, error: null }, // booking_slots insert #3
      { data: null, error: null }, // audit log
    ];

    const mock = {
      from: jest.fn(() => {
        const idx = callCount.n++;
        return createChain(responses[idx] || { data: null, error: null });
      }),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const result = await createRecurringBooking(ORG_ID, makeFormData());
    expect(result.success).toBe(true);
    expect(result.message).toContain("1 skipped");
  });
});

describe("cancelRecurringBooking", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when recurring booking not found", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });

    const callCount = { n: 0 };
    const responses: any[] = [
      { data: null, error: null }, // recurring booking not found
    ];

    const mock = {
      from: jest.fn(() => {
        const idx = callCount.n++;
        return createChain(responses[idx] || { data: null, error: null });
      }),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const result = await cancelRecurringBooking(ORG_ID, RECURRING_ID);
    expect(result).toEqual({ error: "Recurring booking not found" });
  });

  it("cancels future bookings successfully", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });

    const futureDate = new Date(Date.now() + 86400000 * 7).toISOString();
    const callCount = { n: 0 };
    const responses: any[] = [
      { data: { id: RECURRING_ID, title: "Weekly Session" }, error: null }, // recurring found
      { data: null, error: null }, // deactivate
      {
        data: [
          { id: "b-1", booking_slots: [{ start_time: futureDate }] },
          { id: "b-2", booking_slots: [{ start_time: "2020-01-01T00:00:00Z" }] }, // past
        ],
        error: null,
      }, // future bookings query
      { data: null, error: null }, // cancel b-1
      { data: null, error: null }, // audit log
    ];

    const mock = {
      from: jest.fn(() => {
        const idx = callCount.n++;
        return createChain(responses[idx] || { data: null, error: null });
      }),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const result = await cancelRecurringBooking(ORG_ID, RECURRING_ID);
    expect(result.success).toBe(true);
    expect(result.message).toContain("Cancelled 1 future bookings");
  });
});

describe("getRecurringBookings", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns list of recurring bookings", async () => {
    const bookings = [
      { id: "r-1", title: "Monday Session", courts: { name: "Court 1" } },
      { id: "r-2", title: "Friday Session", courts: { name: "Court 2" } },
    ];

    const mock = {
      from: jest.fn(() => createChain({ data: bookings, error: null })),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const result = await getRecurringBookings(ORG_ID);
    expect(result).toEqual(bookings);
  });

  it("returns empty array when no recurring bookings", async () => {
    const mock = {
      from: jest.fn(() => createChain({ data: null, error: null })),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const result = await getRecurringBookings(ORG_ID);
    expect(result).toEqual([]);
  });
});
