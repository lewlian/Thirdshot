"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // If no email in URL, redirect to signup
  useEffect(() => {
    if (!email) {
      router.push("/signup");
    }
  }, [email, router]);

  const handleResendVerification = async () => {
    if (countdown > 0 || !email) return;

    setIsResending(true);
    setResendStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendStatus({
          type: "success",
          message: "Verification email sent! Please check your inbox.",
        });
        setCountdown(60); // 60 second cooldown
      } else {
        setResendStatus({
          type: "error",
          message: data.error || "Failed to send verification email. Please try again.",
        });
      }
    } catch (error) {
      setResendStatus({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-gray-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription className="mt-2">
              We've sent a verification link to
            </CardDescription>
            <p className="font-medium text-gray-900 mt-1">{email}</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Messages */}
          {resendStatus.type === "success" && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {resendStatus.message}
              </AlertDescription>
            </Alert>
          )}

          {resendStatus.type === "error" && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {resendStatus.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="space-y-3 text-sm text-gray-600">
            <p className="font-medium text-gray-900">Next steps:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the verification link in the email</li>
              <li>You'll be automatically logged in and ready to book courts!</li>
            </ol>
          </div>

          {/* Important Note */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium text-gray-900 mb-1">⏱️ Important:</p>
            <p>
              The verification link expires in <strong>24 hours</strong>. If you don't verify within this time, you'll need to request a new link.
            </p>
          </div>

          {/* Resend Button */}
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              Didn't receive the email?
            </p>
            <Button
              onClick={handleResendVerification}
              disabled={isResending || countdown > 0}
              variant="outline"
              className="w-full"
            >
              {countdown > 0
                ? `Resend available in ${countdown}s`
                : isResending
                ? "Sending..."
                : "Resend Verification Email"}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Back to Login
            </Link>
          </div>

          {/* Help Text */}
          <div className="text-center text-xs text-gray-500">
            <p>
              Wrong email address?{" "}
              <Link href="/signup" className="underline hover:text-gray-700">
                Sign up again
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
