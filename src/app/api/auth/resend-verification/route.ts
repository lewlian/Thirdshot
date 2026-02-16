import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Simple in-memory rate limiting (for development)
// For production, use Redis/Upstash
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): { allowed: boolean; resetIn?: number } {
  const now = Date.now();
  const key = `resend:${email.toLowerCase()}`;
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
 * Resend email verification link
 * POST /api/auth/resend-verification
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

    // Check rate limit
    const rateLimit = checkRateLimit(email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many verification emails sent. Please try again in ${rateLimit.resetIn} minutes.`,
        },
        { status: 429 }
      );
    }

    // Resend verification email via Supabase
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (error) {
      console.error("Resend verification error:", error);

      // Handle specific Supabase errors
      if (error.message.includes("already confirmed")) {
        return NextResponse.json(
          { error: "This email is already verified. You can log in now." },
          { status: 400 }
        );
      }

      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: "No account found with this email. Please sign up first." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "Failed to send verification email. Please try again later." },
        { status: 500 }
      );
    }

    console.log(`Verification email resent to: ${email}`);

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully",
    });
  } catch (error) {
    console.error("Resend verification endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
