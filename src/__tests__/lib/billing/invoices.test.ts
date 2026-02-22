/**
 * Unit tests for invoice creation and management.
 */

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
}));

import { createInvoice, markInvoicePaid, getOrgInvoices } from "@/lib/billing/invoices";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseMock, createChain } from "@/__tests__/helpers/supabase-mock";

describe("createInvoice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calculates subtotal from line items", async () => {
    const insertedData = { id: "inv-1", subtotal_cents: 5000 };
    const chain = createChain({ data: insertedData, error: null });

    const mock = {
      from: jest.fn(() => chain),
      rpc: jest.fn().mockResolvedValue({ data: "INV-001", error: null }),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const result = await createInvoice({
      organizationId: "org-1",
      userId: "user-1",
      type: "membership",
      lineItems: [
        { description: "Item A", quantity: 1, unit_price_cents: 2000, total_cents: 2000 },
        { description: "Item B", quantity: 1, unit_price_cents: 3000, total_cents: 3000 },
      ],
    });

    // Verify insert was called
    expect(chain.insert).toHaveBeenCalled();
    const insertArg = chain.insert.mock.calls[0][0];
    expect(insertArg.subtotal_cents).toBe(5000);
    expect(insertArg.total_cents).toBe(5000);
  });

  it("calculates subtotal for a single item", async () => {
    const chain = createChain({ data: { id: "inv-2" }, error: null });
    const mock = {
      from: jest.fn(() => chain),
      rpc: jest.fn().mockResolvedValue({ data: "INV-002", error: null }),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    await createInvoice({
      organizationId: "org-1",
      userId: "user-1",
      type: "booking",
      lineItems: [
        { description: "Court", quantity: 1, unit_price_cents: 4000, total_cents: 4000 },
      ],
    });

    const insertArg = chain.insert.mock.calls[0][0];
    expect(insertArg.subtotal_cents).toBe(4000);
  });

  it("defaults due date to 7 days from now", async () => {
    const chain = createChain({ data: { id: "inv-3" }, error: null });
    const mock = {
      from: jest.fn(() => chain),
      rpc: jest.fn().mockResolvedValue({ data: "INV-003", error: null }),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const before = Date.now();
    await createInvoice({
      organizationId: "org-1",
      userId: "user-1",
      type: "manual",
      lineItems: [
        { description: "X", quantity: 1, unit_price_cents: 1000, total_cents: 1000 },
      ],
    });
    const after = Date.now();

    const insertArg = chain.insert.mock.calls[0][0];
    const dueDate = new Date(insertArg.due_date).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(dueDate).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(dueDate).toBeLessThanOrEqual(after + sevenDays + 1000);
  });

  it("uses custom dueDays when provided", async () => {
    const chain = createChain({ data: { id: "inv-4" }, error: null });
    const mock = {
      from: jest.fn(() => chain),
      rpc: jest.fn().mockResolvedValue({ data: "INV-004", error: null }),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const before = Date.now();
    await createInvoice({
      organizationId: "org-1",
      userId: "user-1",
      type: "manual",
      lineItems: [
        { description: "X", quantity: 1, unit_price_cents: 1000, total_cents: 1000 },
      ],
      dueDays: 30,
    });
    const after = Date.now();

    const insertArg = chain.insert.mock.calls[0][0];
    const dueDate = new Date(insertArg.due_date).getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    expect(dueDate).toBeGreaterThanOrEqual(before + thirtyDays - 1000);
    expect(dueDate).toBeLessThanOrEqual(after + thirtyDays + 1000);
  });

  it("defaults currency to SGD", async () => {
    const chain = createChain({ data: { id: "inv-5" }, error: null });
    const mock = {
      from: jest.fn(() => chain),
      rpc: jest.fn().mockResolvedValue({ data: "INV-005", error: null }),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    await createInvoice({
      organizationId: "org-1",
      userId: "user-1",
      type: "manual",
      lineItems: [
        { description: "X", quantity: 1, unit_price_cents: 100, total_cents: 100 },
      ],
    });

    const insertArg = chain.insert.mock.calls[0][0];
    expect(insertArg.currency).toBe("SGD");
  });

  it("throws on RPC failure (no invoice number)", async () => {
    const mock = {
      from: jest.fn(() => createChain({ data: null, error: null })),
      rpc: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      }),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    await expect(
      createInvoice({
        organizationId: "org-1",
        userId: "user-1",
        type: "manual",
        lineItems: [
          { description: "X", quantity: 1, unit_price_cents: 100, total_cents: 100 },
        ],
      })
    ).rejects.toThrow("Failed to generate invoice number");
  });
});

describe("markInvoicePaid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates status to paid", async () => {
    const chain = createChain({ data: { id: "inv-1", status: "paid" }, error: null });
    const mock = {
      from: jest.fn(() => chain),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    await markInvoicePaid("inv-1");

    expect(chain.update).toHaveBeenCalled();
    const updateArg = chain.update.mock.calls[0][0];
    expect(updateArg.status).toBe("paid");
    expect(updateArg.paid_at).toBeDefined();
  });

  it("includes payment_id when provided", async () => {
    const chain = createChain({ data: { id: "inv-1" }, error: null });
    const mock = {
      from: jest.fn(() => chain),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    await markInvoicePaid("inv-1", "pay-123");

    const updateArg = chain.update.mock.calls[0][0];
    expect(updateArg.payment_id).toBe("pay-123");
  });

  it("sets payment_id to null when not provided", async () => {
    const chain = createChain({ data: { id: "inv-1" }, error: null });
    const mock = {
      from: jest.fn(() => chain),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    await markInvoicePaid("inv-1");

    const updateArg = chain.update.mock.calls[0][0];
    expect(updateArg.payment_id).toBeNull();
  });
});

describe("getOrgInvoices pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calculates correct range for page 1", async () => {
    const chain = createChain({ data: [], count: 0, error: null });
    const mock = {
      from: jest.fn(() => chain),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    await getOrgInvoices("org-1", { page: 1, pageSize: 20 });

    expect(chain.range).toHaveBeenCalledWith(0, 19);
  });

  it("calculates correct range for page 2", async () => {
    const chain = createChain({ data: [], count: 50, error: null });
    const mock = {
      from: jest.fn(() => chain),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    await getOrgInvoices("org-1", { page: 2, pageSize: 20 });

    expect(chain.range).toHaveBeenCalledWith(20, 39);
  });

  it("returns correct page count", async () => {
    const chain = createChain({ data: [], count: 45, error: null });
    const mock = {
      from: jest.fn(() => chain),
      rpc: jest.fn(),
      auth: { getUser: jest.fn() },
    };
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mock);

    const result = await getOrgInvoices("org-1", { pageSize: 20 });
    expect(result.pages).toBe(3); // ceil(45/20)
    expect(result.total).toBe(45);
  });
});
