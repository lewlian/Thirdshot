"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav({ orgSlug }: { orgSlug?: string }) {
  const pathname = usePathname();

  // Don't render nav without org context — links would be broken
  if (!orgSlug) return null;

  const prefix = `/o/${orgSlug}`;

  const navItems = [
    {
      href: `${prefix}/courts`,
      label: "Courts",
      icon: Calendar,
    },
    {
      href: `${prefix}/bookings`,
      label: "Bookings",
      icon: FileText,
    },
    {
      href: `${prefix}/profile`,
      label: "Profile",
      icon: User,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-inset-bottom"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                active
                  ? "text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  active && "stroke-[2.5px]"
                )}
              />
              <span
                className={cn(
                  "text-xs",
                  active ? "font-semibold" : "font-medium"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
