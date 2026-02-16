"use client";

import { useState } from "react";
import { CreditCard, QrCode, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCardDisplay, formatCardExpiry } from "@/lib/hitpay/recurring";
import type { SavedCardInfo } from "@/lib/actions/payment-methods";

export type PaymentOption = "saved_card" | "new_payment";

interface PaymentMethodSelectorProps {
  savedCard: SavedCardInfo | null;
  selectedMethod: PaymentOption;
  onMethodChange: (method: PaymentOption) => void;
}

export function PaymentMethodSelector({
  savedCard,
  selectedMethod,
  onMethodChange,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">
        Payment Method
      </h3>

      <div className="space-y-2">
        {/* Saved Card Option */}
        {savedCard && (
          <button
            type="button"
            onClick={() => onMethodChange("saved_card")}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all",
              selectedMethod === "saved_card"
                ? "border-primary bg-primary/5"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  selectedMethod === "saved_card"
                    ? "bg-primary/10 text-primary"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                )}
              >
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="font-medium">
                  {formatCardDisplay(savedCard.cardBrand, savedCard.cardLast4)}
                </p>
                {savedCard.cardExpiryMonth && savedCard.cardExpiryYear && (
                  <p className="text-sm text-gray-500">
                    Expires {formatCardExpiry(savedCard.cardExpiryMonth, savedCard.cardExpiryYear)}
                  </p>
                )}
              </div>
            </div>
            {selectedMethod === "saved_card" && (
              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </button>
        )}

        {/* New Payment Option (PayNow/Card/Apple Pay/Google Pay) */}
        <button
          type="button"
          onClick={() => onMethodChange("new_payment")}
          className={cn(
            "w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all",
            selectedMethod === "new_payment"
              ? "border-primary bg-primary/5"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-lg",
                selectedMethod === "new_payment"
                  ? "bg-primary/10 text-primary"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500"
              )}
            >
              <QrCode className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-medium">
                {savedCard ? "Other payment methods" : "Choose payment method"}
              </p>
              <p className="text-sm text-gray-500">
                PayNow • Card • Apple Pay • Google Pay
              </p>
            </div>
          </div>
          {selectedMethod === "new_payment" && (
            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
