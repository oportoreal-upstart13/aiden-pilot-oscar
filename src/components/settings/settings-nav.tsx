"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@upstart13-com/aiden-ui/utils";

const items = [
  { href: "/dashboard/settings/profile", label: "Profile" },
  { href: "/dashboard/settings/security", label: "Security" },
  { href: "/dashboard/settings/appearance", label: "Appearance" },
  { href: "/dashboard/settings/data-privacy", label: "Data & Privacy" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <aside className="shrink-0 lg:w-48">
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-sm px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
