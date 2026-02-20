"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validations/auth";
import {
  checkRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  RATE_LIMITS,
  formatRateLimitError,
} from "@/lib/rate-limit";

export type AuthActionResult = {
  error?: string;
  success?: boolean;
};

export async function login(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check if already rate limited (read-only check)
  const rateLimitStatus = getRateLimitStatus(
    parsed.data.email,
    RATE_LIMITS.LOGIN_FAILED
  );

  if (rateLimitStatus && !rateLimitStatus.allowed) {
    return {
      error: formatRateLimitError(rateLimitStatus, "login"),
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Record failed login attempt
    checkRateLimit(parsed.data.email, RATE_LIMITS.LOGIN_FAILED);

    // Check if error is due to unconfirmed email
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error: "Please verify your email address before logging in. Check your inbox for the verification link.",
      };
    }
    return { error: error.message };
  }

  // Get user and check email verification status
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Check if email is confirmed
    if (!user.email_confirmed_at) {
      // Log out the user
      await supabase.auth.signOut();

      // Record failed login attempt (unverified email)
      checkRateLimit(parsed.data.email, RATE_LIMITS.LOGIN_FAILED);

      return {
        error: "Please verify your email address before logging in. Check your inbox for the verification link.",
      };
    }

    // Login successful - reset rate limit
    resetRateLimit(parsed.data.email, RATE_LIMITS.LOGIN_FAILED.keyPrefix);

    // Update last login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('supabase_id', user.id);
  }

  redirect("/");
}

export async function signup(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get("email") as string,
    name: formData.get("name") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = signupSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check rate limit for signup attempts (3 per hour per email)
  const rateLimit = checkRateLimit(parsed.data.email, RATE_LIMITS.SIGNUP);

  if (!rateLimit.allowed) {
    return {
      error: formatRateLimitError(rateLimit, "signup"),
    };
  }

  const supabase = await createServerSupabaseClient();

  // Create Supabase auth user
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        name: parsed.data.name,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Failed to create account" };
  }

  // Create user in our database
  await supabase
    .from('users')
    .insert({
      email: parsed.data.email,
      name: parsed.data.name,
      supabase_id: data.user.id,
    });

  // Redirect to verify email page
  redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function logout() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function syncUserFromSupabase(supabaseUser: {
  id: string;
  email?: string;
  user_metadata?: { name?: string; avatar_url?: string };
}) {
  const supabase = await createServerSupabaseClient();

  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_id', supabaseUser.id)
    .single();

  if (existingUser) {
    // Update last login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', existingUser.id);
    return existingUser;
  }

  // Create new user
  const { data: newUser } = await supabase
    .from('users')
    .insert({
      email: supabaseUser.email || "",
      name: supabaseUser.user_metadata?.name || null,
      avatar_url: supabaseUser.user_metadata?.avatar_url || null,
      supabase_id: supabaseUser.id,
    })
    .select()
    .single();

  return newUser;
}
