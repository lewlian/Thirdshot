import { Header } from "@/components/common/header";
import { MobileBottomNav } from "@/components/common/mobile-bottom-nav";
import { Footer } from "@/components/common/footer";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgBySlug } from "@/lib/org-context";
import { getUserOrgRole } from "@/lib/permissions";

export default async function MemberLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  const supabaseUser = await getUser();

  let isAdmin = false;
  if (supabaseUser) {
    const supabase = await createServerSupabaseClient();
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("supabase_id", supabaseUser.id)
      .single();

    if (dbUser) {
      const role = await getUserOrgRole(dbUser.id, org.id);
      isAdmin = role === "owner" || role === "admin";
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header user={supabaseUser} isAdmin={isAdmin} orgSlug={slug} />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav orgSlug={slug} />
    </div>
  );
}
