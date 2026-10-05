"use client";

import { useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import type { BreakdownRow } from "@/lib/stats";
import { formatMinutesLong } from "@/lib/time";
import { cn } from "@/lib/utils";

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function CategoryBreakdown({ rows }: { rows: BreakdownRow[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No time tracked in this period yet.</p>;
  }
  const max = rows[0].seconds;

  return (
    <ul className="grid gap-1">
      {rows.map((row) => {
        const expanded = open.has(row.id);
        return (
          <li key={row.id}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() =>
                setOpen((prev) => {
                  const next = new Set(prev);
                  if (next.has(row.id)) next.delete(row.id);
                  else next.add(row.id);
                  return next;
                })
              }
              className="group grid w-full gap-1.5 rounded-lg px-2 py-2 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex items-center gap-2 text-sm">
                <ChevronRightIcon className={cn("size-3.5 text-muted-foreground transition-transform", expanded && "rotate-90")} />
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color ?? "var(--status-todo)" }} />
                <span className="flex-1 truncate font-medium">{row.name}</span>
                <span className="tabular-nums">{formatMinutesLong(row.seconds / 60)}</span>
                <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{pct(row.share)}</span>
              </span>
              <span className="ml-5.5 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(row.seconds / max) * 100}%`, backgroundColor: row.color ?? "var(--status-todo)" }}
                />
              </span>
            </button>
            {expanded && (
              <ul className="mb-2 ml-9 grid gap-1 border-l pl-3">
                {row.subcategories.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 py-0.5 text-sm">
                    <span className={cn("flex-1 truncate", s.name === "No subcategory" && "text-muted-foreground italic")}>{s.name}</span>
                    <span className="tabular-nums">{formatMinutesLong(s.seconds / 60)}</span>
                    <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{pct(s.share)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
