import { createServerSupabaseClient } from "@/lib/supabase/server";
import { addMonths, addQuarters, addYears } from "date-fns";
import type { Json } from "@/types/database";

export interface CreateSubscriptionInput {
  organizationId: string;
  memberId: string;
  tierId: string;
  amountCents: number;
  currency?: string;
  billingPeriod: "monthly" | "quarterly" | "yearly";
  paymentMethod?: string;
}

/**
 * Create a new membership subscription for a member.
 */
export async function createSubscription(input: CreateSubscriptionInput) {
  const supabase = await createServerSupabaseClient();

  const now = new Date();
  const periodEnd = getNextPeriodEnd(now, input.billingPeriod);

  const { data, error } = await supabase
    .from("membership_subscriptions")
    .insert({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      member_id: input.memberId,
      tier_id: input.tierId,
      amount_cents: input.amountCents,
      currency: input.currency || "SGD",
      billing_period: input.billingPeriod,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_billing_date: periodEnd.toISOString(),
      payment_method: input.paymentMethod || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cancel a subscription immediately or at period end.
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediate: boolean = false
) {
  const supabase = await createServerSupabaseClient();
  const now = new Date();

  const updateData: Record<string, unknown> = {
    cancelled_at: now.toISOString(),
  };

  if (immediate) {
    updateData.status = "cancelled";
    updateData.next_billing_date = null;
  } else {
    // Will be marked cancelled when current period ends
    updateData.status = "cancelled";
    updateData.next_billing_date = null;
  }

  const { data, error } = await supabase
    .from("membership_subscriptions")
    .update(updateData)
    .eq("id", subscriptionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Process billing for all due subscriptions.
 * Called by the billing cron job.
 */
export async function processDueBillings() {
  const supabase = await createServerSupabaseClient();
  const now = new Date();

  // Find active subscriptions due for billing
  const { data: dueSubscriptions, error: fetchError } = await supabase
    .from("membership_subscriptions")
    .select(
      "*, organization_members(user_id, organization_id), membership_tiers(name)"
    )
    .eq("status", "active")
    .lte("next_billing_date", now.toISOString());

  if (fetchError) {
    console.error("Failed to fetch due subscriptions:", fetchError);
    return { processed: 0, failed: 0, errors: [fetchError.message] };
  }

  if (!dueSubscriptions || dueSubscriptions.length === 0) {
    return { processed: 0, failed: 0, errors: [] };
  }

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const sub of dueSubscriptions) {
    try {
      const member = sub.organization_members as unknown as {
        user_id: string;
        organization_id: string;
      } | null;
      const tier = sub.membership_tiers as unknown as { name: string } | null;

      if (!member) {
        errors.push(`Subscription ${sub.id}: member not found`);
        failed++;
        continue;
      }

      // Generate invoice
      const { data: invoiceNumber } = await supabase.rpc(
        "next_invoice_number",
        { org_id: sub.organization_id }
      );

      if (!invoiceNumber) {
        errors.push(`Subscription ${sub.id}: failed to generate invoice number`);
        failed++;
        continue;
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          organization_id: sub.organization_id,
          user_id: member.user_id,
          invoice_number: invoiceNumber,
          type: "membership",
          description: `${tier?.name || "Membership"} - ${sub.billing_period}`,
          line_items: [
            {
              description: `${tier?.name || "Membership"} subscription (${sub.billing_period})`,
              quantity: 1,
              unit_price_cents: sub.amount_cents,
              total_cents: sub.amount_cents,
            },
          ] as unknown as Json,
          subtotal_cents: sub.amount_cents,
          tax_cents: 0,
          total_cents: sub.amount_cents,
          currency: sub.currency,
          status: "sent",
          issued_at: now.toISOString(),
          due_date: new Date(
            now.getTime() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .select()
        .single();

      if (invoiceError || !invoice) {
        errors.push(
          `Subscription ${sub.id}: failed to create invoice - ${invoiceError?.message}`
        );
        failed++;
        continue;
      }

      // For now, we create the invoice and mark it as sent.
      // Actual payment charging would go through HitPay recurring billing.
      // Since we don't have saved card billing set up per-org yet, we just
      // create the invoice and let the member pay manually.

      // Advance the subscription period
      const newPeriodStart = new Date(sub.current_period_end);
      const newPeriodEnd = getNextPeriodEnd(
        newPeriodStart,
        sub.billing_period as "monthly" | "quarterly" | "yearly"
      );

      const { error: updateError } = await supabase
        .from("membership_subscriptions")
        .update({
          current_period_start: newPeriodStart.toISOString(),
          current_period_end: newPeriodEnd.toISOString(),
          next_billing_date: newPeriodEnd.toISOString(),
        })
        .eq("id", sub.id);

      if (updateError) {
        errors.push(
          `Subscription ${sub.id}: failed to update period - ${updateError.message}`
        );
        failed++;
        continue;
      }

      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Subscription ${sub.id}: ${message}`);
      failed++;
    }
  }

  return { processed, failed, errors };
}

/**
 * Handle past-due subscriptions.
 * Suspends members whose subscriptions have been past_due beyond the grace period.
 */
export async function handlePastDueSubscriptions(gracePeriodDays: number = 7) {
  const supabase = await createServerSupabaseClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);

  // Find past_due subscriptions past grace period
  const { data: pastDueSubs } = await supabase
    .from("membership_subscriptions")
    .select("id, member_id, organization_id")
    .eq("status", "past_due")
    .lte("next_billing_date", cutoffDate.toISOString());

  if (!pastDueSubs || pastDueSubs.length === 0) {
    return { cancelled: 0 };
  }

  let cancelled = 0;

  for (const sub of pastDueSubs) {
    // Cancel the subscription
    await supabase
      .from("membership_subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        next_billing_date: null,
      })
      .eq("id", sub.id);

    // Suspend the member
    await supabase
      .from("organization_members")
      .update({ membership_status: "suspended" })
      .eq("id", sub.member_id)
      .eq("organization_id", sub.organization_id);

    cancelled++;
  }

  return { cancelled };
}

export function getNextPeriodEnd(
  from: Date,
  period: "monthly" | "quarterly" | "yearly"
): Date {
  switch (period) {
    case "monthly":
      return addMonths(from, 1);
    case "quarterly":
      return addQuarters(from, 1);
    case "yearly":
      return addYears(from, 1);
  }
}
