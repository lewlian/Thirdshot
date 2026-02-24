import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the application base URL.
 * Priority: NEXT_PUBLIC_APP_URL > VERCEL_URL (auto-set by Vercel) > localhost
 */
/**
 * Get the currency symbol for a given currency code.
 */
export function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case "SGD":
    case "USD":
    case "AUD":
    case "CAD":
    case "NZD":
    case "HKD":
      return "$";
    case "MYR":
      return "RM";
    case "GBP":
      return "\u00a3";
    case "EUR":
      return "\u20ac";
    case "THB":
      return "\u0e3f";
    case "JPY":
      return "\u00a5";
    default:
      return currency;
  }
}

/**
 * Format a cents amount as a currency string using the org's currency.
 * e.g. formatCurrency(2000, "SGD") => "$20.00"
 */
export function formatCurrency(cents: number, currency: string = "SGD"): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
