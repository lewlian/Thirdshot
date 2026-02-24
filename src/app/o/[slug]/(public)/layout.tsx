import { getOrgBySlug } from "@/lib/org-context";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  const user = await getUser();

  // Check if logged-in user is already a member
  let isMember = false;
  let isSuperAdmin = false;
  if (user) {
    const supabase = await createServerSupabaseClient();
    const { data: dbUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("supabase_id", user.id)
      .single();
    if (dbUser) {
      isSuperAdmin = dbUser.role === "ADMIN";
      const { data: membership } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", org.id)
        .eq("user_id", dbUser.id)
        .maybeSingle();
      isMember = !!membership;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal header with org branding */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/o/${slug}`} className="flex items-center gap-2">
              {org.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={org.name}
                  className="h-8 w-8 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: org.primary_color }}
                >
                  {org.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-bold text-lg text-gray-900">
                {org.name}
              </span>
            </Link>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Dashboard
                  </Link>
                  {isSuperAdmin && (
                    <Link
                      href="/create-org"
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Create Org
                    </Link>
                  )}
                  {isMember ? (
                    <Link
                      href={`/o/${slug}/courts`}
                      className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800"
                    >
                      Go to Courts
                    </Link>
                  ) : (
                    <Link
                      href={`/o/${slug}/join`}
                      className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800"
                    >
                      Join Club
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href={`/login?redirect=/o/${slug}/join`}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Sign in
                  </Link>
                  <Link
                    href={`/o/${slug}/join`}
                    className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800"
                  >
                    Join
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-sm text-gray-500 text-center">
            Powered by{" "}
            <Link href="/" className="text-gray-700 hover:underline">
              Thirdshot
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
