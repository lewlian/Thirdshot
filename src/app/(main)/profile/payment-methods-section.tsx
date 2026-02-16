"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreditCard, Plus, Trash2, Loader2, CheckCircle } from "lucide-react";
import { initiateSaveCard, removeSavedPaymentMethod, type SavedCardInfo } from "@/lib/actions/payment-methods";
import { formatCardDisplay, formatCardExpiry } from "@/lib/hitpay/recurring";

interface PaymentMethodsSectionProps {
  savedCard: SavedCardInfo | null;
}

export function PaymentMethodsSection({ savedCard }: PaymentMethodsSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if card was just saved (redirected back from HitPay)
  const justSaved = searchParams.get("saved") === "true";

  const handleAddCard = () => {
    setError(null);
    startTransition(async () => {
      const result = await initiateSaveCard();
      if (result.error) {
        setError(result.error);
      } else if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    });
  };

  const handleRemoveCard = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeSavedPaymentMethod();
      if (result.error) {
        setError(result.error);
      } else {
        setShowDeleteDialog(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>
            Save a card for faster checkout
          </CardDescription>
        </CardHeader>
        <CardContent>
          {justSaved && !savedCard && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              Card is being processed. It may take a moment to appear.
            </div>
          )}

          {justSaved && savedCard && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Card saved successfully!
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {savedCard ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">
                    {formatCardDisplay(savedCard.cardBrand, savedCard.cardLast4)}
                  </p>
                  {savedCard.cardExpiryMonth && savedCard.cardExpiryYear && (
                    <p className="text-sm text-muted-foreground">
                      Expires {formatCardExpiry(savedCard.cardExpiryMonth, savedCard.cardExpiryYear)}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAddCard}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Payment Method
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this card? You can add a new one at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveCard}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
