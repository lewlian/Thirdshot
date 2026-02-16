// HitPay API Types

export interface CreatePaymentRequest {
  amount: number; // In dollars (e.g., 10.50)
  currency: string;
  email: string;
  name?: string;
  phone?: string;
  purpose: string;
  reference_number: string;
  redirect_url: string;
  webhook: string;
  allow_repeated_payments?: boolean;
  expiry_date?: string; // ISO 8601 format
}

export interface CreatePaymentResponse {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  amount: string;
  currency: string;
  status: "pending" | "completed" | "failed" | "expired";
  purpose: string;
  reference_number: string;
  payment_methods: string[];
  url: string; // Payment URL to redirect user
  redirect_url: string;
  webhook: string;
  send_sms: boolean;
  send_email: boolean;
  sms_status: string;
  email_status: string;
  allow_repeated_payments: boolean;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookPayload {
  payment_id: string;
  payment_request_id: string;
  phone: string | null;
  amount: string;
  currency: string;
  status: "completed" | "failed" | "pending" | "expired";
  reference_number: string;
  hmac: string;
  // PayNow specific
  paynow_qr?: string;
  // Additional fields
  [key: string]: unknown;
}

export interface PaymentStatus {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  amount: string;
  currency: string;
  status: "pending" | "completed" | "failed" | "expired";
  purpose: string;
  reference_number: string;
  payments: PaymentDetail[];
  created_at: string;
  updated_at: string;
}

export interface PaymentDetail {
  id: string;
  amount: string;
  currency: string;
  status: "completed" | "failed" | "pending";
  payment_type: string; // e.g., "paynow_online", "card"
  fees: string;
  created_at: string;
}

export type HitPayEnvironment = "sandbox" | "production";
