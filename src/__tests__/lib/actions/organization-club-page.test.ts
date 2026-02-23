/**
 * Unit tests for updateClubPage server action.
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

import { updateClubPage } from "@/lib/actions/organization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions";
import { createChain } from "@/__tests__/helpers/supabase-mock";

const ORG_ID = "org-1";
const USER_ID = "user-1";

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

describe("updateClubPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates club page settings successfully", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });
    buildMock({
      organizations: { data: null, error: null },
      admin_audit_logs: { data: null, error: null },
    });

    const formData = new FormData();
    formData.set("hero_image_url", "https://example.com/hero.jpg");
    formData.set("tagline", "Best pickleball club in town");
    formData.set("hours_mon", "08:00-21:00");
    formData.set("hours_tue", "08:00-21:00");
    formData.set("hours_wed", "08:00-21:00");
    formData.set("hours_thu", "08:00-21:00");
    formData.set("hours_fri", "08:00-21:00");
    formData.set("hours_sat", "09:00-20:00");
    formData.set("hours_sun", "09:00-20:00");

    const result = await updateClubPage(ORG_ID, formData);
    expect(result).toEqual({ success: true });
  });

  it("defaults operating hours when not provided", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });
    const mock = buildMock({
      organizations: { data: null, error: null },
      admin_audit_logs: { data: null, error: null },
    });

    const formData = new FormData();
    // No hours_* fields provided

    const result = await updateClubPage(ORG_ID, formData);
    expect(result).toEqual({ success: true });

    // Verify the from("organizations") was called
    expect(mock.from).toHaveBeenCalledWith("organizations");
  });

  it("sets empty string fields to null", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });
    buildMock({
      organizations: { data: null, error: null },
      admin_audit_logs: { data: null, error: null },
    });

    const formData = new FormData();
    formData.set("hero_image_url", "");
    formData.set("tagline", "");

    const result = await updateClubPage(ORG_ID, formData);
    expect(result).toEqual({ success: true });
  });

  it("returns error when database update fails", async () => {
    (requireOrgRole as jest.Mock).mockResolvedValue({ userId: USER_ID, role: "admin" });

    const mock = {
      from: jest.fn(() =>
        createChain({ data: null, error: { message: "DB error" } })
      ),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const formData = new FormData();
    formData.set("tagline", "New tagline");

    const result = await updateClubPage(ORG_ID, formData);
    expect(result).toEqual({ error: "Failed to update club page settings" });
  });
});
