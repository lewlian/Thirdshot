/**
 * Unit tests for member management server actions.
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

import {
  updateMemberRole,
  suspendMember,
  removeMember,
} from "@/lib/actions/members";
import { getOrgAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createChain } from "@/__tests__/helpers/supabase-mock";

const ORG_ID = "org-1";
const ADMIN_ID = "admin-user";
const MEMBER_ID = "member-1";

function mockAdmin(adminUser: { id: string } | null) {
  (getOrgAdmin as jest.Mock).mockResolvedValue(adminUser);
}

/**
 * Build a mock Supabase client that returns different data per-table.
 * Each call to `from(table)` returns a fresh chain resolving to the
 * configured value for that table.
 */
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

describe("updateMemberRole", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when admin is null (unauthorized)", async () => {
    mockAdmin(null);
    const result = await updateMemberRole(ORG_ID, MEMBER_ID, "staff");
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns error for invalid role", async () => {
    mockAdmin({ id: ADMIN_ID });
    const result = await updateMemberRole(
      ORG_ID,
      MEMBER_ID,
      "superadmin" as any
    );
    expect(result).toEqual({ error: "Invalid role" });
  });

  it("prevents self-demotion", async () => {
    mockAdmin({ id: ADMIN_ID });

    // The member lookup returns a member whose user_id matches the admin
    buildMock({
      organization_members: {
        data: { id: MEMBER_ID, user_id: ADMIN_ID, role: "admin" },
        error: null,
      },
      admin_audit_logs: { data: null, error: null },
    });

    const result = await updateMemberRole(ORG_ID, MEMBER_ID, "member");
    expect(result).toEqual({ error: "Cannot demote your own role" });
  });

  it("only owners can assign owner role", async () => {
    mockAdmin({ id: ADMIN_ID });

    // First call for member lookup, second for admin membership check
    // Since our mock returns same data for the same table, we build a
    // mock where organization_members returns admin role = "admin" (not owner)
    const callCount = { organization_members: 0 };
    const responses: Record<string, any>[] = [
      // 1st: member lookup
      { data: { id: MEMBER_ID, user_id: "other-user", role: "staff" }, error: null },
      // 2nd: admin membership check → role: admin (not owner)
      { data: { role: "admin" }, error: null },
      // 3rd: update (if reached)
      { data: null, error: null },
      // 4th: audit log insert
      { data: null, error: null },
    ];

    const mock = {
      from: jest.fn((table: string) => {
        if (table === "organization_members") {
          const idx = callCount.organization_members++;
          return createChain(responses[idx] || { data: null, error: null });
        }
        return createChain({ data: null, error: null });
      }),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const result = await updateMemberRole(ORG_ID, MEMBER_ID, "owner");
    expect(result).toEqual({
      error: "Only owners can assign admin or owner roles",
    });
  });

  it("only owners can assign admin role", async () => {
    mockAdmin({ id: ADMIN_ID });

    const callCount = { organization_members: 0 };
    const responses: any[] = [
      { data: { id: MEMBER_ID, user_id: "other-user", role: "staff" }, error: null },
      { data: { role: "admin" }, error: null }, // admin is not owner
    ];

    const mock = {
      from: jest.fn((table: string) => {
        if (table === "organization_members") {
          const idx = callCount.organization_members++;
          return createChain(responses[idx] || { data: null, error: null });
        }
        return createChain({ data: null, error: null });
      }),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const result = await updateMemberRole(ORG_ID, MEMBER_ID, "admin");
    expect(result).toEqual({
      error: "Only owners can assign admin or owner roles",
    });
  });

  it("succeeds for valid role change (owner assigning admin)", async () => {
    mockAdmin({ id: ADMIN_ID });

    const callCount = { organization_members: 0 };
    const responses: any[] = [
      { data: { id: MEMBER_ID, user_id: "other-user", role: "member" }, error: null },
      { data: { role: "owner" }, error: null }, // admin IS owner
      { data: null, error: null }, // update success
    ];

    const mock = {
      from: jest.fn((table: string) => {
        if (table === "organization_members") {
          const idx = callCount.organization_members++;
          return createChain(responses[idx] || { data: null, error: null });
        }
        return createChain({ data: null, error: null });
      }),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const result = await updateMemberRole(ORG_ID, MEMBER_ID, "admin");
    expect(result).toEqual({ success: true });
  });

  it("succeeds for non-elevated role change (admin assigning staff)", async () => {
    mockAdmin({ id: ADMIN_ID });

    const callCount = { organization_members: 0 };
    const responses: any[] = [
      { data: { id: MEMBER_ID, user_id: "other-user", role: "member" }, error: null },
      { data: null, error: null }, // update
    ];

    const mock = {
      from: jest.fn((table: string) => {
        if (table === "organization_members") {
          const idx = callCount.organization_members++;
          return createChain(responses[idx] || { data: null, error: null });
        }
        return createChain({ data: null, error: null });
      }),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const result = await updateMemberRole(ORG_ID, MEMBER_ID, "staff");
    expect(result).toEqual({ success: true });
  });

  it("returns error when member not found", async () => {
    mockAdmin({ id: ADMIN_ID });
    buildMock({
      organization_members: { data: null, error: null },
    });

    const result = await updateMemberRole(ORG_ID, MEMBER_ID, "staff");
    expect(result).toEqual({ error: "Member not found" });
  });
});

describe("suspendMember", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when unauthorized", async () => {
    mockAdmin(null);
    const result = await suspendMember(ORG_ID, MEMBER_ID);
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("cannot suspend owners", async () => {
    mockAdmin({ id: ADMIN_ID });
    buildMock({
      organization_members: {
        data: {
          id: MEMBER_ID,
          user_id: "owner-user",
          role: "owner",
          membership_status: "active",
        },
        error: null,
      },
    });

    const result = await suspendMember(ORG_ID, MEMBER_ID);
    expect(result).toEqual({ error: "Cannot suspend an owner" });
  });

  it("cannot suspend yourself", async () => {
    mockAdmin({ id: ADMIN_ID });
    buildMock({
      organization_members: {
        data: {
          id: MEMBER_ID,
          user_id: ADMIN_ID, // same as admin
          role: "admin",
          membership_status: "active",
        },
        error: null,
      },
    });

    const result = await suspendMember(ORG_ID, MEMBER_ID);
    expect(result).toEqual({ error: "Cannot suspend yourself" });
  });

  it("succeeds for valid suspension", async () => {
    mockAdmin({ id: ADMIN_ID });
    buildMock({
      organization_members: {
        data: {
          id: MEMBER_ID,
          user_id: "other-user",
          role: "member",
          membership_status: "active",
        },
        error: null,
      },
      admin_audit_logs: { data: null, error: null },
    });

    const result = await suspendMember(ORG_ID, MEMBER_ID);
    expect(result).toEqual({ success: true });
  });

  it("returns error when member not found", async () => {
    mockAdmin({ id: ADMIN_ID });
    buildMock({
      organization_members: { data: null, error: null },
    });

    const result = await suspendMember(ORG_ID, MEMBER_ID);
    expect(result).toEqual({ error: "Member not found" });
  });
});

describe("removeMember", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when unauthorized", async () => {
    mockAdmin(null);
    const result = await removeMember(ORG_ID, MEMBER_ID);
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("cannot remove owners", async () => {
    mockAdmin({ id: ADMIN_ID });
    buildMock({
      organization_members: {
        data: { id: MEMBER_ID, user_id: "owner-user", role: "owner" },
        error: null,
      },
    });

    const result = await removeMember(ORG_ID, MEMBER_ID);
    expect(result).toEqual({ error: "Cannot remove an owner" });
  });

  it("cannot remove yourself", async () => {
    mockAdmin({ id: ADMIN_ID });
    buildMock({
      organization_members: {
        data: { id: MEMBER_ID, user_id: ADMIN_ID, role: "admin" },
        error: null,
      },
    });

    const result = await removeMember(ORG_ID, MEMBER_ID);
    expect(result).toEqual({ error: "Cannot remove yourself" });
  });

  it("succeeds for valid removal", async () => {
    mockAdmin({ id: ADMIN_ID });
    buildMock({
      organization_members: {
        data: { id: MEMBER_ID, user_id: "other-user", role: "member" },
        error: null,
      },
      admin_audit_logs: { data: null, error: null },
    });

    const result = await removeMember(ORG_ID, MEMBER_ID);
    expect(result).toEqual({ success: true });
  });

  it("returns error when member not found", async () => {
    mockAdmin({ id: ADMIN_ID });
    buildMock({
      organization_members: { data: null, error: null },
    });

    const result = await removeMember(ORG_ID, MEMBER_ID);
    expect(result).toEqual({ error: "Member not found" });
  });
});
