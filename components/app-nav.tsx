"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3Icon, CalendarCheckIcon, SettingsIcon, TagsIcon, UsersIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Today", icon: CalendarCheckIcon },
  { href: "/stats", label: "Stats", icon: BarChart3Icon },
  { href: "/categories", label: "Categories", icon: TagsIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const ADMIN_LINK = { href: "/admin/users", label: "Users", icon: UsersIcon };

function linksFor(isAdmin: boolean) {
  return isAdmin ? [...LINKS, ADMIN_LINK] : LINKS;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppHeader({ isAdmin, name }: { isAdmin: boolean; name: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 h-14 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-6 px-4 md:px-6">
        <Link href="/" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {linksFor(isAdmin).map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                isActive(pathname, href) && "bg-muted font-medium text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href="/settings"
          className="ml-auto flex items-center gap-2 rounded-full text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={`Signed in as ${name}`}
        >
          <span className="hidden max-w-48 truncate sm:inline">{name}</span>
          <span
            className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground uppercase"
            aria-hidden="true"
          >
            {name.trim().charAt(0) || "?"}
          </span>
        </Link>
      </div>
    </header>
  );
}

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className={cn("grid h-16", isAdmin ? "grid-cols-5" : "grid-cols-4")}>
        {linksFor(isAdmin).map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground outline-none focus-visible:bg-muted",
                  active && "font-medium text-primary",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
