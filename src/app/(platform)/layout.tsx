import { Header } from "@/components/common/header";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseUser = await getUser();

  let isSuperAdmin = false;
  if (supabaseUser) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("users")
      .select("role")
      .eq("supabase_id", supabaseUser.id)
      .single();
    isSuperAdmin = data?.role === "ADMIN";
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header user={supabaseUser} isSuperAdmin={isSuperAdmin} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
