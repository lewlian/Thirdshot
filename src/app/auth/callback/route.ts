import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { syncUserFromSupabase } from "@/lib/actions/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const type = searchParams.get("type");

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Cookies can't be set in read-only contexts
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the user and sync to our database
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await syncUserFromSupabase({
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
        });
      }

      // Use redirect() instead of NextResponse.redirect() so that
      // cookies set via cookieStore.set() are included in the response
      const redirectPath = type === "recovery" ? "/reset-password" : next;
      redirect(redirectPath);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
