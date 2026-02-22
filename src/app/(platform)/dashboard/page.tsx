import { redirect } from "next/navigation";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserOrgs } from "@/lib/org-context";
import Link from "next/link";
import { Suspense } from "react";

export default async function DashboardPage() {
  const supabaseUser = await getUser();
  if (!supabaseUser) redirect("/login");

  const supabase = await createServerSupabaseClient();
  const { data: dbUser } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("supabase_id", supabaseUser.id)
    .single();

  if (!dbUser) redirect("/login");

  const orgMemberships = await getUserOrgs(dbUser.id);

  // If user belongs to exactly one org, redirect directly
  if (orgMemberships.length === 1) {
    const org = orgMemberships[0].organizations as any;
    redirect(`/o/${org.slug}/courts`);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Welcome, {dbUser.name || dbUser.email}</h1>
        <p className="text-muted-foreground mb-8">Select an organization to continue</p>

        {orgMemberships.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">No organizations yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first organization to get started with Thirdshot.
            </p>
            <Link
              href="/create-org"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6"
            >
              Create Organization
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {orgMemberships.map((membership) => {
              const org = membership.organizations as any;
              return (
                <Link
                  key={membership.id}
                  href={`/o/${org.slug}/courts`}
                  className="block p-6 rounded-lg border border-border bg-card hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {org.logo_url ? (
                      <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{org.name[0]}</span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{org.name}</h3>
                      <span className="text-xs text-muted-foreground capitalize">{membership.role}</span>
                    </div>
                  </div>
                  {org.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{org.description}</p>
                  )}
                </Link>
              );
            })}
            <Link
              href="/create-org"
              className="flex items-center justify-center p-6 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors text-muted-foreground hover:text-foreground"
            >
              + Create New Organization
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
