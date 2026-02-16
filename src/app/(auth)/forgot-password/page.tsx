"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          type: "success",
          message: "Password reset link sent! Check your email inbox (and spam folder).",
        });
        setEmail(""); // Clear the form
      } else {
        setStatus({
          type: "error",
          message: data.error || "Failed to send reset link. Please try again.",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Login
      </Link>

      <Card>
        <CardHeader className="space-y-1">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-gray-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Forgot Password?
          </CardTitle>
          <CardDescription className="text-center">
            No worries! Enter your email and we'll send you a reset link.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Status Messages */}
          {status.type === "success" && (
            <Alert className="bg-green-50 border-green-200 mb-6">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {status.message}
              </AlertDescription>
            </Alert>
          )}

          {status.type === "error" && (
            <Alert className="bg-red-50 border-red-200 mb-6">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {status.message}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !email}
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>

          {/* Help Text */}
          <div className="mt-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-1">📧 What happens next?</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>We'll send a password reset link to your email</li>
                <li>Click the link (valid for 1 hour)</li>
                <li>Set your new password</li>
                <li>Log in with your new password</li>
              </ol>
            </div>

            {/* Additional Help */}
            <div className="text-center text-sm text-gray-600">
              <p>
                Remember your password?{" "}
                <Link href="/login" className="font-medium text-gray-900 hover:underline">
                  Back to Login
                </Link>
              </p>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p>
                Don't have an account?{" "}
                <Link href="/signup" className="font-medium text-gray-900 hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
