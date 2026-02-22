import Link from "next/link";
import { getOrgBySlug } from "@/lib/org-context";
import { requireOrgRole } from "@/lib/permissions";
import { getCurrentDbUser } from "@/lib/org-context";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  const { userId } = await requireOrgRole(org.id, "admin");

  const dbUser = await getCurrentDbUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href={`/o/${slug}/admin`} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {org.name} Admin
                </span>
              </Link>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Welcome, {dbUser?.name || dbUser?.email}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={`/o/${slug}/courts`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to Site
              </Link>
            </div>
          </div>
        </div>
      </header>

      <AdminNav slug={slug} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
