/**
 * Unit tests for waiver server actions.
 */

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
  getUser: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  requireOrgRole: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import {
  getActiveWaiver,
  getUserWaiverStatus,
  signWaiver,
  updateWaiver,
} from "@/lib/actions/waivers";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions";
import { createChain } from "@/__tests__/helpers/supabase-mock";

const ORG_ID = "org-1";
const USER_ID = "user-1";
const WAIVER_ID = "waiver-1";

function buildMock(tableResponses: Record<string, any>) {
  const mock = {
    from: jest.fn((table: string) => {
      return createChain(tableResponses[table] || { data: null, error: null });
    }),
    rpc: jest.fn(),
    auth: { getUser: jest.fn() },
  };
  (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);
  return mock;
}

describe("getActiveWaiver", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns waiver when one is active", async () => {
    const waiver = { id: WAIVER_ID, title: "Liability Waiver", is_active: true, version: 1 };
    buildMock({
      waivers: { data: waiver, error: null },
    });

    const result = await getActiveWaiver(ORG_ID);
    expect(result).toEqual(waiver);
  });

  it("returns null when no active waiver exists", async () => {
    buildMock({
      waivers: { data: null, error: null },
    });

    const result = await getActiveWaiver(ORG_ID);
    expect(result).toBeNull();
  });
});

describe("getUserWaiverStatus", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns not required when no active waiver", async () => {
    buildMock({
      waivers: { data: null, error: null },
    });

    const result = await getUserWaiverStatus(ORG_ID, USER_ID);
    expect(result).toEqual({ required: false, signed: false, waiver: null });
  });

  it("returns required and signed when user has signature", async () => {
    const waiver = { id: WAIVER_ID, title: "Waiver", is_active: true, version: 1 };

    // First call returns waiver (from getActiveWaiver), second returns signature
    const callCount = { n: 0 };
    const responses: any[] = [
      { data: waiver, error: null },          // waivers (getActiveWaiver)
      { data: { id: "sig-1" }, error: null },  // waiver_signatures
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

    const result = await getUserWaiverStatus(ORG_ID, USER_ID);
    expect(result.required).toBe(true);
    expect(result.signed).toBe(true);
    expect(result.waiver).toEqual(waiver);
  });

  it("returns required and not signed when no signature exists", async () => {
    const waiver = { id: WAIVER_ID, title: "Waiver", is_active: true, version: 1 };

    const callCount = { n: 0 };
    const responses: any[] = [
      { data: waiver, error: null },
      { data: null, error: null },   // no signature
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

    const result = await getUserWaiverStatus(ORG_ID, USER_ID);
    expect(result.required).toBe(true);
    expect(result.signed).toBe(false);
  });
});

describe("signWaiver", () => {
  beforeEach(() => jest.clearAllMocks());

  it("redirects to login when user is not authenticated", async () => {
    (getUser as jest.Mock).mockResolvedValue(null);

    await expect(signWaiver(ORG_ID, WAIVER_ID)).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to login when db user not found", async () => {
    (getUser as jest.Mock).mockResolvedValue({ id: "supabase-1" });
    buildMock({
      users: { data: null, error: null },
    });

    await expect(signWaiver(ORG_ID, WAIVER_ID)).rejects.toThrow("REDIRECT:/login");
  });

  it("returns error when waiver not found", async () => {
    (getUser as jest.Mock).mockResolvedValue({ id: "supabase-1" });

    const callCount = { n: 0 };
    const responses: any[] = [
      { data: { id: USER_ID }, error: null },  // users
      { data: null, error: null },              // waivers (not found)
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

    const result = await signWaiver(ORG_ID, WAIVER_ID);
    expect(result).toEqual({ error: "Waiver not found" });
  });

  it("returns success if already signed", async () => {
    (getUser as jest.Mock).mockResolvedValue({ id: "supabase-1" });

    const callCount = { n: 0 };
    const responses: any[] = [
      { data: { id: USER_ID }, error: null },      // users
      { data: { id: WAIVER_ID }, error: null },     // waivers (found)
      { data: { id: "sig-1" }, error: null },       // waiver_signatures (exists)
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

    const result = await signWaiver(ORG_ID, WAIVER_ID);
    expect(result).toEqual({ success: true });
  });

  it("creates signature and returns success for new signing", async () => {
    (getUser as jest.Mock).mockResolvedValue({ id: "supabase-1" });

    const callCount = { n: 0 };
    const responses: any[] = [
      { data: { id: USER_ID }, error: null },  // users
      { data: { id: WAIVER_ID }, error: null }, // waivers (found)
      { data: null, error: null },              // waiver_signatures (not found)
      { data: null, error: null },              // insert signature
      { data: null, error: null },              // update member status
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

    const result = await signWaiver(ORG_ID, WAIVER_ID);
    expect(result).toEqual({ success: true });
  });

  it("returns error when insert fails", async () => {
    (getUser as jest.Mock).mockResolvedValue({ id: "supabase-1" });

    const callCount = { n: 0 };
    const responses: any[] = [
      { data: { id: USER_ID }, error: null },  // users
      { data: { id: WAIVER_ID }, error: null }, // waivers
      { data: null, error: null },              // signatures (not found)
      { data: null, error: { message: "DB error" } }, // insert fails
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

    const result = await signWaiver(ORG_ID, WAIVER_ID);
    expect(result).toEqual({ error: "Failed to sign waiver" });
  });
});

describe("updateWaiver", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when content is too short", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });

    const formData = new FormData();
    formData.set("title", "Waiver");
    formData.set("content", "short");
    formData.set("is_active", "true");

    const result = await updateWaiver(ORG_ID, formData);
    expect(result).toEqual({ error: "Waiver content must be at least 10 characters" });
  });

  it("returns error when content is empty", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });

    const formData = new FormData();
    formData.set("title", "Waiver");
    formData.set("content", "");
    formData.set("is_active", "true");

    const result = await updateWaiver(ORG_ID, formData);
    expect(result).toEqual({ error: "Waiver content must be at least 10 characters" });
  });

  it("creates a new waiver when none exists", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });
    buildMock({
      waivers: { data: null, error: null },
      admin_audit_logs: { data: null, error: null },
    });

    const formData = new FormData();
    formData.set("title", "Liability Waiver");
    formData.set("content", "This is a waiver document with sufficient content for testing.");
    formData.set("is_active", "true");

    const result = await updateWaiver(ORG_ID, formData);
    expect(result).toEqual({ success: true });
  });

  it("updates existing waiver and increments version", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });

    const callCount = { n: 0 };
    const responses: any[] = [
      { data: { id: WAIVER_ID, version: 2 }, error: null },  // existing waiver
      { data: null, error: null },                             // update
      { data: null, error: null },                             // audit log
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

    const formData = new FormData();
    formData.set("title", "Updated Waiver");
    formData.set("content", "This is updated waiver content that is long enough for testing.");
    formData.set("is_active", "true");

    const result = await updateWaiver(ORG_ID, formData);
    expect(result).toEqual({ success: true });
  });

  it("defaults title to Liability Waiver when not provided", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });
    buildMock({
      waivers: { data: null, error: null },
      admin_audit_logs: { data: null, error: null },
    });

    const formData = new FormData();
    formData.set("content", "This is a waiver document with sufficient content for testing.");
    formData.set("is_active", "true");

    const result = await updateWaiver(ORG_ID, formData);
    expect(result).toEqual({ success: true });
  });
});
