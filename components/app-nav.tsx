"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { CalendarIcon, CategoriesIcon, SettingsIcon, StatsIcon, TodayIcon, UsersIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Today", icon: TodayIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/stats", label: "Stats", icon: StatsIcon },
  { href: "/categories", label: "Categories", icon: CategoriesIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const ADMIN_LINK = { href: "/admin/users", label: "Users", icon: UsersIcon };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppHeader({ isAdmin, name }: { isAdmin: boolean; name: string }) {
  const pathname = usePathname();
  const links = isAdmin ? [...LINKS, ADMIN_LINK] : LINKS;

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/65">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-6 px-4 md:px-6">
        <Link href="/" className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-0.5 rounded-2xl border border-border/70 bg-card/60 p-1 shadow-xs md:flex">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-muted-foreground transition-all outline-none hover:bg-muted/70 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                  active && "bg-primary/10 font-medium text-primary hover:bg-primary/15 hover:text-primary",
                )}
              >
                <Icon className="size-4.5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/settings"
          className="ml-auto flex items-center gap-2.5 rounded-full py-1 pr-1 pl-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={`Signed in as ${name}`}
        >
          <span className="hidden max-w-48 truncate sm:inline">{name}</span>
          <span
            className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.62_0.17_320)] text-xs font-semibold text-primary-foreground uppercase shadow-sm"
            aria-hidden="true"
          >
            {name.trim().charAt(0) || "?"}
          </span>
        </Link>
      </div>
    </header>
  );
}

/** Mobile: five thumb-reachable tabs. The admin Users page is linked from Settings. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-full flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground outline-none focus-visible:bg-muted",
                  active && "font-medium text-primary",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary/12",
                  )}
                >
                  <Icon className="size-5.5" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
