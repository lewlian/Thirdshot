import { Header } from "@/components/common/header";
import { MobileBottomNav } from "@/components/common/mobile-bottom-nav";
import { Footer } from "@/components/common/footer";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseUser = await getUser();

  let dbUser = null;
  if (supabaseUser) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('supabase_id', supabaseUser.id)
      .single();
    dbUser = data;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header user={supabaseUser} isAdmin={dbUser?.role === "ADMIN"} />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
