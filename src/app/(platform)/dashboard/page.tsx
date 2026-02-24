import { redirect } from "next/navigation";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getUserOrgs } from "@/lib/org-context";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabaseUser = await getUser();
  if (!supabaseUser) redirect("/login");

  const supabase = await createServerSupabaseClient();
  const { data: dbUser } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("supabase_id", supabaseUser.id)
    .single();

  if (!dbUser) redirect("/login");

  const orgMemberships = await getUserOrgs(dbUser.id);

  // If user belongs to exactly one org, redirect directly
  if (orgMemberships.length === 1) {
    const org = orgMemberships[0].organizations as any;
    redirect(`/o/${org.slug}/courts`);
  }

  // Fetch all active public organizations for discovery
  const adminClient = createAdminSupabaseClient();
  const { data: publicOrgs } = await adminClient
    .from("organizations")
    .select("id, name, slug, description, city, country")
    .eq("is_active", true)
    .order("name");

  // Filter out orgs the user already belongs to
  const memberOrgIds = new Set(
    orgMemberships.map((m) => (m.organizations as any).id)
  );
  const discoverableOrgs = (publicOrgs || []).filter(
    (org) => !memberOrgIds.has(org.id)
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Welcome, {dbUser.name || dbUser.email}</h1>

        {/* User's existing org memberships */}
        {orgMemberships.length > 0 && (
          <>
            <p className="text-muted-foreground mb-6">Select a club to continue</p>
            <div className="grid gap-4 sm:grid-cols-2 mb-12">
              {orgMemberships.map((membership) => {
                const org = membership.organizations as any;
                return (
                  <Link
                    key={membership.id}
                    href={`/o/${org.slug}/courts`}
                    className="block p-6 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">{org.name[0]}</span>
                      </div>
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
              {dbUser.role === "ADMIN" && (
                <Link
                  href="/create-org"
                  className="flex items-center justify-center p-6 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors text-muted-foreground hover:text-foreground"
                >
                  + Create New Organization
                </Link>
              )}
            </div>
          </>
        )}

        {/* Discover clubs section */}
        {orgMemberships.length === 0 && (
          <p className="text-muted-foreground mb-6">
            Browse available clubs and join one to start booking courts.
          </p>
        )}

        {discoverableOrgs.length > 0 && (
          <div>
            {orgMemberships.length > 0 && (
              <h2 className="text-xl font-semibold mb-4">Discover More Clubs</h2>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {discoverableOrgs.map((org) => (
                <div
                  key={org.id}
                  className="p-6 rounded-xl border border-border bg-card hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-lg text-foreground">{org.name[0]}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{org.name}</h3>
                      {org.city && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {org.city}{org.country ? `, ${org.country}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  {org.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{org.description}</p>
                  )}
                  <Button asChild size="sm" className="w-full rounded-full">
                    <Link href={`/o/${org.slug}`}>
                      View Club
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {orgMemberships.length === 0 && discoverableOrgs.length === 0 && (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">No clubs available yet</h2>
            <p className="text-muted-foreground mb-6">
              There are no clubs on the platform yet. Check back soon!
            </p>
            {dbUser.role === "ADMIN" && (
              <Button asChild>
                <Link href="/create-org">Create Organization</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
