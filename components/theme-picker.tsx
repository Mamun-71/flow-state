"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "system", label: "System", icon: MonitorIcon },
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
] as const;

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex gap-1 rounded-xl bg-muted p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              active && "bg-background font-medium text-foreground shadow-xs",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function noopSubscribe() {
  return () => {};
}
