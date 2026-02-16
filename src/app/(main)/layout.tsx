import { Header } from "@/components/common/header";
import { MobileBottomNav } from "@/components/common/mobile-bottom-nav";
import { Footer } from "@/components/common/footer";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseUser = await getUser();

  // Get the Prisma user with role information
  let dbUser = null;
  if (supabaseUser) {
    dbUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
      select: { role: true },
    });
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
