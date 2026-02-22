import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes only for unauthenticated users
const authRoutes = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));

  // Redirect authenticated users away from auth routes
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protected platform routes (not org-scoped)
  if ((pathname === "/dashboard" || pathname.startsWith("/create-org")) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Org-scoped member/admin routes require auth
  // Public routes like /o/{slug}/book don't require auth
  const orgMemberMatch = pathname.match(/^\/o\/[^/]+\/(bookings|profile|courts)/);
  const orgAdminMatch = pathname.match(/^\/o\/[^/]+\/admin/);

  if ((orgMemberMatch || orgAdminMatch) && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Legacy route redirects: /courts, /bookings, /profile, /admin → /dashboard
  // (dashboard will resolve the user's org and redirect)
  const legacyRoutes = ["/courts", "/bookings", "/profile", "/admin"];
  const isLegacyRoute = legacyRoutes.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );
  if (isLegacyRoute && !pathname.startsWith("/o/")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
