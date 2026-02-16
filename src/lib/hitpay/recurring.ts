/**
 * HitPay Recurring Billing API
 * Used for saving cards and charging saved cards
 *
 * Documentation: https://docs.hitpayapp.com/apis/guide/save-card-for-billing
 */

import type { HitPayEnvironment } from "./types";

const API_URLS: Record<HitPayEnvironment, string> = {
  sandbox: "https://api.sandbox.hit-pay.com/v1",
  production: "https://api.hit-pay.com/v1",
};

function getApiUrl(): string {
  const env = (process.env.NEXT_PUBLIC_HITPAY_ENV ||
    "sandbox") as HitPayEnvironment;
  return API_URLS[env];
}

function getApiKey(): string {
  const key = process.env.HITPAY_API_KEY;
  if (!key) {
    throw new Error("HITPAY_API_KEY is not configured");
  }
  return key;
}

// ============================================
// Types
// ============================================

export interface CreateSaveCardRequest {
  customerEmail: string;
  customerName: string;
  redirectUrl: string;
  webhook: string;
  reference?: string;
}

export interface CreateSaveCardResponse {
  id: string;
  business_id: string;
  customer_email: string;
  customer_name: string;
  amount: string;
  currency: string;
  status: string;
  save_card: boolean;
  url: string; // Redirect URL for customer to enter card
  redirect_url: string;
  webhook: string;
  created_at: string;
  updated_at: string;
}

export interface SavedCardDetails {
  id: string;
  business_id: string;
  customer_email: string;
  customer_name: string;
  status: string;
  card_brand?: string; // "visa", "mastercard"
  card_last_four?: string; // "4242"
  card_expiry_month?: string;
  card_expiry_year?: string;
  created_at: string;
  updated_at: string;
}

export interface ChargeCardRequest {
  billingId: string;
  amount: number; // In dollars (e.g., 40.00)
  currency: string;
}

export interface ChargeCardResponse {
  id: string;
  recurring_billing_id: string;
  amount: string;
  currency: string;
  status: "succeeded" | "failed" | "pending";
  payment_id?: string;
  failure_reason?: string;
  created_at: string;
}

export interface RecurringWebhookPayload {
  recurring_billing_id: string;
  status: string;
  amount: string;
  currency: string;
  customer_email: string;
  customer_name: string;
  card_brand?: string;
  card_last_four?: string;
  card_expiry_month?: string;
  card_expiry_year?: string;
  reference?: string;
  hmac: string;
  [key: string]: unknown;
}

// ============================================
// API Functions
// ============================================

/**
 * Create a "save card" billing session
 * User will be redirected to HitPay to enter their card details
 */
export async function createSaveCardSession(
  data: CreateSaveCardRequest
): Promise<CreateSaveCardResponse> {
  const isLocalhost = data.webhook.includes("localhost");

  const bodyParams: Record<string, string> = {
    customer_email: data.customerEmail,
    customer_name: data.customerName,
    name: "Save payment method", // Required field
    amount: "1.00", // Minimum amount required by HitPay (won't be charged)
    currency: "SGD",
    save_card: "true",
    redirect_url: data.redirectUrl,
  };

  // Only add webhook if not localhost
  if (!isLocalhost) {
    bodyParams.webhook = data.webhook;
  }

  if (data.reference) {
    bodyParams.reference = data.reference;
  }

  const response = await fetch(`${getApiUrl()}/recurring-billing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-BUSINESS-API-KEY": getApiKey(),
    },
    body: new URLSearchParams(bodyParams),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("HitPay Save Card Error:", errorText);
    throw new Error(`HitPay API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get saved card details for a billing session
 * Returns card brand, last 4 digits, and expiry
 */
export async function getSavedCardDetails(
  billingId: string
): Promise<SavedCardDetails> {
  const response = await fetch(
    `${getApiUrl()}/recurring-billing/${billingId}`,
    {
      method: "GET",
      headers: {
        "X-BUSINESS-API-KEY": getApiKey(),
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HitPay API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Charge a saved card
 * This will immediately charge the card without user interaction
 */
export async function chargeSavedCard(
  data: ChargeCardRequest
): Promise<ChargeCardResponse> {
  const bodyParams = {
    amount: data.amount.toFixed(2),
    currency: data.currency,
  };

  const response = await fetch(
    `${getApiUrl()}/recurring-billing/${data.billingId}/charge`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-BUSINESS-API-KEY": getApiKey(),
      },
      body: new URLSearchParams(bodyParams),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("HitPay Charge Card Error:", errorText);
    throw new Error(`HitPay API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Delete/cancel a saved card billing session
 */
export async function deleteSavedCard(billingId: string): Promise<void> {
  const response = await fetch(
    `${getApiUrl()}/recurring-billing/${billingId}`,
    {
      method: "DELETE",
      headers: {
        "X-BUSINESS-API-KEY": getApiKey(),
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HitPay API error: ${response.status} - ${errorText}`);
  }
}

/**
 * Helper function to format card display string
 */
export function formatCardDisplay(
  brand?: string | null,
  last4?: string | null
): string {
  if (!brand || !last4) {
    return "Card";
  }

  const brandName = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
  return `${brandName} •••• ${last4}`;
}

/**
 * Helper function to format card expiry
 */
export function formatCardExpiry(
  month?: string | null,
  year?: string | null
): string {
  if (!month || !year) {
    return "";
  }

  // Year might be "2027" or "27"
  const shortYear = year.length === 4 ? year.slice(2) : year;
  return `${month.padStart(2, "0")}/${shortYear}`;
}
