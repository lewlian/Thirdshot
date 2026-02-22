import { createServerSupabaseClient } from "@/lib/supabase/server";

export type TemplateType =
  | "booking_confirmation"
  | "membership_welcome"
  | "membership_renewal"
  | "membership_expired"
  | "payment_failed"
  | "waitlist_offer"
  | "announcement";

interface TemplateVars {
  member_name?: string;
  member_email?: string;
  org_name?: string;
  org_logo_url?: string;
  booking_date?: string;
  booking_time?: string;
  court_name?: string;
  invoice_number?: string;
  amount_due?: string;
  membership_tier?: string;
  expiry_date?: string;
  action_url?: string;
  [key: string]: string | undefined;
}

/**
 * Get an email template for an org, falling back to system defaults.
 */
export async function getTemplate(
  orgId: string,
  type: TemplateType
): Promise<{ subject: string; bodyHtml: string } | null> {
  const supabase = await createServerSupabaseClient();

  // Try org-specific template first
  const { data: orgTemplate } = await supabase
    .from("email_templates")
    .select("subject, body_html")
    .eq("organization_id", orgId)
    .eq("type", type)
    .eq("is_active", true)
    .single();

  if (orgTemplate) {
    return { subject: orgTemplate.subject, bodyHtml: orgTemplate.body_html };
  }

  // Fall back to system default (organization_id IS NULL)
  const { data: systemTemplate } = await supabase
    .from("email_templates")
    .select("subject, body_html")
    .is("organization_id", null)
    .eq("type", type)
    .eq("is_active", true)
    .single();

  if (systemTemplate) {
    return {
      subject: systemTemplate.subject,
      bodyHtml: systemTemplate.body_html,
    };
  }

  return null;
}

/**
 * Replace template variables like {{member_name}} with actual values.
 */
export function renderTemplate(
  template: string,
  vars: TemplateVars
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

/**
 * Send an email using a template, with logging.
 * This is a stub that logs the email. In production, integrate with Resend.
 */
export async function sendTemplatedEmail(
  orgId: string,
  recipientEmail: string,
  type: TemplateType,
  vars: TemplateVars
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const template = await getTemplate(orgId, type);
  if (!template) {
    return { success: false, error: `No template found for type: ${type}` };
  }

  const subject = renderTemplate(template.subject, vars);
  const bodyHtml = renderTemplate(template.bodyHtml, vars);

  // In production, call Resend API here:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // const { data, error } = await resend.emails.send({ ... });

  // For now, log the email attempt
  console.log(`[Email] To: ${recipientEmail}, Subject: ${subject}`);

  // Log to email_log table
  await supabase.from("email_log").insert({
    id: crypto.randomUUID(),
    organization_id: orgId,
    recipient_email: recipientEmail,
    template_type: type,
    subject,
    status: "sent", // Would be based on Resend response in production
  });

  return { success: true };
}
