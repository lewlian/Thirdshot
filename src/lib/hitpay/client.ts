import crypto from "crypto";
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentStatus,
  HitPayEnvironment,
  WebhookPayload,
} from "./types";

const API_URLS: Record<HitPayEnvironment, string> = {
  sandbox: "https://api.sandbox.hit-pay.com/v1",
  production: "https://api.hit-pay.com/v1",
};

function getApiUrl(): string {
  const env = (process.env.NEXT_PUBLIC_HITPAY_ENV || "sandbox") as HitPayEnvironment;
  return API_URLS[env];
}

function getApiKey(): string {
  const key = process.env.HITPAY_API_KEY;
  if (!key) {
    throw new Error("HITPAY_API_KEY is not configured");
  }
  return key;
}

function getSalt(): string {
  const salt = process.env.HITPAY_SALT;
  if (!salt) {
    throw new Error("HITPAY_SALT is not configured");
  }
  return salt;
}

/**
 * Create a payment request with HitPay
 */
export async function createPaymentRequest(
  data: CreatePaymentRequest
): Promise<CreatePaymentResponse> {
  // Build request body - only include webhook if it's not localhost
  const isLocalhost = data.webhook.includes("localhost");

  const bodyParams: Record<string, string> = {
    amount: data.amount.toFixed(2),
    currency: data.currency,
    email: data.email,
    purpose: data.purpose,
    reference_number: data.reference_number,
    redirect_url: data.redirect_url,
  };

  // Only add webhook if not localhost (HitPay rejects localhost webhooks)
  if (!isLocalhost) {
    bodyParams.webhook = data.webhook;
  }

  if (data.name) bodyParams.name = data.name;
  if (data.phone) bodyParams.phone = data.phone;
  if (data.expiry_date) bodyParams.expiry_date = data.expiry_date;

  const response = await fetch(`${getApiUrl()}/payment-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-BUSINESS-API-KEY": getApiKey(),
    },
    body: new URLSearchParams(bodyParams),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("HitPay API Error:", errorText);
    throw new Error(`HitPay API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get payment request status
 */
export async function getPaymentStatus(paymentRequestId: string): Promise<PaymentStatus> {
  const response = await fetch(
    `${getApiUrl()}/payment-requests/${paymentRequestId}`,
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
 * Delete/cancel a payment request
 */
export async function deletePaymentRequest(paymentRequestId: string): Promise<void> {
  const response = await fetch(
    `${getApiUrl()}/payment-requests/${paymentRequestId}`,
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
 * Verify webhook signature from HitPay
 * HitPay sends an HMAC signature to verify the webhook is authentic
 */
export function verifyWebhookSignature(payload: WebhookPayload): boolean {
  const salt = getSalt();

  // Extract the hmac from payload
  const receivedHmac = payload.hmac;
  if (!receivedHmac) {
    return false;
  }

  // Build the string to hash (all fields except hmac, sorted alphabetically)
  const sortedKeys = Object.keys(payload)
    .filter((key) => key !== "hmac")
    .sort();

  const dataString = sortedKeys
    .map((key) => {
      const value = payload[key];
      // Handle null/undefined values
      if (value === null || value === undefined) {
        return "";
      }
      return String(value);
    })
    .join("");

  // Create HMAC-SHA256
  const computedHmac = crypto
    .createHmac("sha256", salt)
    .update(dataString)
    .digest("hex");

  return computedHmac === receivedHmac;
}

/**
 * Helper to create a payment for a booking
 */
export async function createBookingPayment(params: {
  bookingId: string;
  amountCents: number;
  currency: string;
  userEmail: string;
  userName?: string;
  courtName: string;
  bookingDate: string;
  bookingTime: string;
}): Promise<CreatePaymentResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const paymentData: CreatePaymentRequest = {
    amount: params.amountCents / 100, // Convert cents to dollars
    currency: params.currency,
    email: params.userEmail,
    name: params.userName,
    purpose: `Court booking: ${params.courtName} on ${params.bookingDate} at ${params.bookingTime}`,
    reference_number: params.bookingId,
    redirect_url: `${appUrl}/bookings/${params.bookingId}/confirmation`,
    webhook: `${appUrl}/api/webhooks/hitpay`,
  };

  return createPaymentRequest(paymentData);
}
