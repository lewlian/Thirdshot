import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Header } from "@/components/common/header";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thirdshot - Book Pickleball Courts",
  description: "Book pickleball courts in Singapore. Fast, simple, game on.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
