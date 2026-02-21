import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/utils";

// Simple in-memory rate limiting (for development)
// For production, use Redis/Upstash
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): { allowed: boolean; resetIn?: number } {
  const now = Date.now();
  const key = `reset:${email.toLowerCase()}`;
  const limit = rateLimitStore.get(key);

  // Clean up expired entries
  if (limit && limit.resetAt < now) {
    rateLimitStore.delete(key);
  }

  const current = rateLimitStore.get(key);

  if (!current) {
    // First request in this window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + 60 * 60 * 1000, // 1 hour from now
    });
    return { allowed: true };
  }

  if (current.count >= 3) {
    // Rate limit exceeded
    const resetIn = Math.ceil((current.resetAt - now) / 1000 / 60); // minutes
    return { allowed: false, resetIn };
  }

  // Increment count
  current.count++;
  return { allowed: true };
}

/**
 * Request password reset email
 * POST /api/auth/forgot-password
 *
 * Rate limit: 3 requests per hour per email
 *
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimit = checkRateLimit(email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many password reset requests. Please try again in ${rateLimit.resetIn} minutes.`,
        },
        { status: 429 }
      );
    }

    // Send password reset email via Supabase
    const supabase = await createServerSupabaseClient();
    const appUrl = getAppUrl();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });

    if (error) {
      console.error("Password reset error:", error);

      // Don't reveal if user exists or not (security best practice)
      // Always return success to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: "If an account exists with that email, a password reset link has been sent.",
      });
    }

    console.log(`Password reset email sent to: ${email}`);

    // Return success message
    // Note: We don't reveal if the email exists or not for security
    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
