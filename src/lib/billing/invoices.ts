import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

interface LineItem {
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

export interface CreateInvoiceInput {
  organizationId: string;
  userId: string;
  type: "membership" | "booking" | "manual";
  description?: string;
  lineItems: LineItem[];
  currency?: string;
  dueDays?: number;
}

/**
 * Create and issue an invoice.
 */
export async function createInvoice(input: CreateInvoiceInput) {
  const supabase = await createServerSupabaseClient();
  const now = new Date();

  // Generate invoice number
  const { data: invoiceNumber, error: numError } = await supabase.rpc(
    "next_invoice_number",
    { org_id: input.organizationId }
  );

  if (numError || !invoiceNumber) {
    throw new Error("Failed to generate invoice number");
  }

  const subtotal = input.lineItems.reduce(
    (sum, item) => sum + item.total_cents,
    0
  );

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + (input.dueDays || 7));

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: input.organizationId,
      user_id: input.userId,
      invoice_number: invoiceNumber,
      type: input.type,
      description: input.description || null,
      line_items: input.lineItems as unknown as Json,
      subtotal_cents: subtotal,
      tax_cents: 0,
      total_cents: subtotal,
      currency: input.currency || "SGD",
      status: "sent",
      issued_at: now.toISOString(),
      due_date: dueDate.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return invoice;
}

/**
 * Get invoices for an organization with optional filters.
 */
export async function getOrgInvoices(
  orgId: string,
  options?: {
    status?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const supabase = await createServerSupabaseClient();
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("invoices")
    .select("*, users(name, email)", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options?.status) {
    query = query.eq("status", options.status as "draft" | "sent" | "paid" | "overdue" | "cancelled" | "void");
  }

  if (options?.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    invoices: data || [],
    total: count || 0,
    pages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Mark an invoice as paid.
 */
export async function markInvoicePaid(
  invoiceId: string,
  paymentId?: string
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_id: paymentId || null,
    })
    .eq("id", invoiceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get a member's invoices.
 */
export async function getMemberInvoices(userId: string, orgId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
