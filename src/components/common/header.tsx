"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { Menu, X, Shield, Plus } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  user: User | null;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  orgSlug?: string;
}

export function Header({ user, isAdmin = false, isSuperAdmin = false, orgSlug }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const prefix = orgSlug ? `/o/${orgSlug}` : "";
  const homeHref = orgSlug ? `/o/${orgSlug}/courts` : "/";

  const navLinks = [
    { href: homeHref, label: orgSlug ? "Courts" : "Home" },
    ...(!orgSlug ? [{ href: "/courts", label: "Courts" }] : []),
    ...(user ? [{ href: `${prefix}/bookings`, label: "My Bookings" }] : []),
    ...(isAdmin ? [{ href: `${prefix}/admin`, label: "Admin", icon: Shield }] : []),
    ...(isSuperAdmin ? [{ href: "/create-org", label: "Create Org", icon: Plus }] : []),
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-border/40 sticky top-0 z-50 card-elevated">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-18">
          <div className="flex">
            <Link href={homeHref} className="flex-shrink-0 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-base">T</span>
              </div>
              <span className="text-xl font-bold text-foreground">
                Thirdshot
              </span>
            </Link>
            <div className="hidden sm:ml-10 sm:flex sm:space-x-6">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isAdminLink = link.href === "/admin";
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 px-1 py-2 text-sm transition-colors ${
                      isActive(link.href)
                        ? "text-foreground font-semibold"
                        : "text-foreground/60 hover:text-foreground font-medium"
                    }`}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden sm:ml-6 sm:flex sm:items-center gap-3">
            {user ? (
              <>
                <Link href={`${prefix}/profile`}>
                  <Button variant="ghost" size="sm" className="rounded-full font-medium">
                    Profile
                  </Button>
                </Link>
                <form action={logout}>
                  <Button variant="outline" size="sm" type="submit" className="rounded-full border-border/60 font-medium">
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="rounded-full font-medium">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    size="sm"
                    className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 shadow-sm"
                  >
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white/95 backdrop-blur-md border-t border-border/50">
          <div className="pt-2 pb-3 space-y-1 px-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isAdminLink = link.href === "/admin";
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    isActive(link.href)
                      ? isAdminLink
                        ? "bg-gray-200 text-gray-900 ring-1 ring-gray-300"
                        : "bg-gray-900 text-white"
                      : isAdminLink
                      ? "text-gray-700 hover:bg-gray-100"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {Icon && <Icon className="h-5 w-5" />}
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="pt-4 pb-3 border-t border-border/50">
            <div className="space-y-1 px-4">
              {user ? (
                <>
                  <Link
                    href={`${prefix}/profile`}
                    className="block px-4 py-3 rounded-xl text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <form action={logout}>
                    <button
                      type="submit"
                      className="block w-full text-left px-4 py-3 rounded-xl text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block px-4 py-3 rounded-xl text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="block px-4 py-3 rounded-xl text-base font-medium text-center bg-gray-900 text-white hover:bg-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
