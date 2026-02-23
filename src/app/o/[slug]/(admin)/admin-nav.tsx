"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const getNavItems = (slug: string) => [
  { href: `/o/${slug}/admin`, label: "Dashboard" },
  { href: `/o/${slug}/admin/courts`, label: "Courts" },
  { href: `/o/${slug}/admin/bookings`, label: "Bookings" },
  { href: `/o/${slug}/admin/calendar`, label: "Calendar" },
  { href: `/o/${slug}/admin/members`, label: "Members" },
  { href: `/o/${slug}/admin/finance`, label: "Finance" },
  { href: `/o/${slug}/admin/audit-log`, label: "Audit Log" },
  { href: `/o/${slug}/admin/settings`, label: "Settings" },
];

export function AdminNav({ slug }: { slug: string }) {
  const pathname = usePathname();

  const navItems = getNavItems(slug);

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-4 overflow-x-auto">
          {navItems.map((item) => {
            const isActive =
              item.href === `/o/${slug}/admin`
                ? pathname === `/o/${slug}/admin`
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
