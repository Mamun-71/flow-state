import Link from "next/link";
import { PERIODS, type Period } from "@/lib/dates";
import { cn } from "@/lib/utils";

const SHORT: Record<Period, string> = { 3: "3d", 7: "7d", 15: "15d", 30: "30d", 90: "90d", 180: "180d", 365: "1y" };

export function PeriodPicker({ value }: { value: Period }) {
  return (
    <nav aria-label="Period" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="inline-flex gap-1 rounded-xl bg-muted p-1">
        {PERIODS.map((p) => (
          <li key={p}>
            <Link
              href={`/stats?period=${p}`}
              scroll={false}
              aria-current={p === value ? "page" : undefined}
              aria-label={p === 365 ? "Last year" : `Last ${p} days`}
              className={cn(
                "flex h-8 min-w-11 items-center justify-center rounded-lg px-2.5 text-sm text-muted-foreground tabular-nums transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                p === value && "bg-background font-medium text-foreground shadow-xs",
              )}
            >
              {SHORT[p]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
