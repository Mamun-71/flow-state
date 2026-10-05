"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useElapsed } from "@/hooks/use-elapsed";
import { buttonVariants } from "@/components/ui/button";
import { addDays, formatDate, formatDayLabel } from "@/lib/dates";
import { formatMinutes } from "@/lib/time";
import { cn } from "@/lib/utils";

type Props = {
  date: string;
  today: string;
  trackedSeconds: number;
  runningSince: string | null;
  runningCountedSeconds: number;
  plannedMinutes: number;
};

export function DayHeader({ date, today, trackedSeconds, runningSince, runningCountedSeconds, plannedMinutes }: Props) {
  const router = useRouter();
  // Swap the server's snapshot of the running session for a live value.
  const live = useElapsed(runningSince);
  const tracked = runningSince ? trackedSeconds - runningCountedSeconds + live : trackedSeconds;
  const trackedMinutes = tracked / 60;
  const hrefFor = (d: string) => (d === today ? "/" : `/?date=${d}`);

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{formatDate(date, "EEEE, d MMMM")}</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{formatDayLabel(date, today)}</h1>
        <div className="mt-3 flex items-center gap-1">
          <Link
            href={hrefFor(addDays(date, -1))}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-9")}
            aria-label="Previous day"
          >
            <ChevronLeftIcon />
          </Link>
          <Link
            href={hrefFor(addDays(date, 1))}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-9")}
            aria-label="Next day"
          >
            <ChevronRightIcon />
          </Link>
          {date !== today && (
            <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "h-9")}>
              Today
            </Link>
          )}
          <label className="relative ml-1">
            <span className="sr-only">Pick a date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && router.push(hrefFor(e.target.value))}
              className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </label>
        </div>
      </div>
      <ProgressSummary trackedMinutes={trackedMinutes} plannedMinutes={plannedMinutes} />
    </div>
  );
}

function ProgressSummary({ trackedMinutes, plannedMinutes }: { trackedMinutes: number; plannedMinutes: number }) {
  const ratio = plannedMinutes > 0 ? trackedMinutes / plannedMinutes : 0;
  const over = ratio > 1;
  const size = 76;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card px-4 py-3 sm:min-w-64">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(1, ratio))}
          className={cn("transition-[stroke-dashoffset] duration-700 ease-out", over ? "stroke-status-over" : "stroke-status-progress")}
        />
      </svg>
      <div>
        <p className="text-xs text-muted-foreground">Tracked / planned</p>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {formatMinutes(Math.floor(trackedMinutes))}
          <span className="text-base font-normal text-muted-foreground"> / {formatMinutes(plannedMinutes)}</span>
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {plannedMinutes > 0 ? `${Math.round(ratio * 100)}% of plan` : "Nothing planned yet"}
        </p>
      </div>
    </div>
  );
}
