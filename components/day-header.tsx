"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useElapsed } from "@/hooks/use-elapsed";
import { useNow } from "@/components/timer-provider";
import { ActualIcon, EstimateIcon, TodayIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { TZ, addDays, formatDate, formatDayLabel } from "@/lib/dates";
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

function greeting(hour: number) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DayHeader({ date, today, trackedSeconds, runningSince, runningCountedSeconds, plannedMinutes }: Props) {
  const router = useRouter();
  const now = useNow();
  // Swap the server's snapshot of the running session for a live value.
  const live = useElapsed(runningSince);
  const tracked = runningSince ? trackedSeconds - runningCountedSeconds + live : trackedSeconds;
  const hrefFor = (d: string) => (d === today ? "/" : `/?date=${d}`);
  const isToday = date === today;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex items-start gap-3.5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/15">
          <TodayIcon className="size-6.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {isToday ? `${greeting(Number(formatInTimeZone(now, TZ, "H")))} · ` : ""}
            {formatDate(date, "EEEE, d MMMM yyyy")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{formatDayLabel(date, today)}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Link
              href={hrefFor(addDays(date, -1))}
              className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-9 rounded-xl")}
              aria-label="Previous day"
            >
              <ChevronLeftIcon />
            </Link>
            <Link
              href={hrefFor(addDays(date, 1))}
              className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-9 rounded-xl")}
              aria-label="Next day"
            >
              <ChevronRightIcon />
            </Link>
            {!isToday && (
              <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "h-9 rounded-xl px-3")}>
                Back to today
              </Link>
            )}
            <label>
              <span className="sr-only">Pick a date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && router.push(hrefFor(e.target.value))}
                className="h-9 rounded-xl border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </label>
          </div>
        </div>
      </div>
      <ProgressSummary trackedMinutes={tracked / 60} plannedMinutes={plannedMinutes} />
    </div>
  );
}

function ProgressSummary({ trackedMinutes, plannedMinutes }: { trackedMinutes: number; plannedMinutes: number }) {
  const ratio = plannedMinutes > 0 ? trackedMinutes / plannedMinutes : 0;
  const over = ratio > 1;
  const size = 88;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-5 rounded-3xl border bg-gradient-to-br from-card via-card to-primary/[0.06] p-4 pr-6 shadow-sm lg:min-w-80">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
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
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
          {plannedMinutes > 0 ? `${Math.round(ratio * 100)}%` : "–"}
        </span>
      </div>
      <dl className="grid gap-2.5">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ActualIcon className="size-3.5 text-primary" /> Actual
          </dt>
          <dd className={cn("text-2xl leading-tight font-semibold tracking-tight tabular-nums", over && "text-status-over")}>
            {formatMinutes(Math.floor(trackedMinutes))}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <EstimateIcon className="size-3.5" /> Planned
          </dt>
          <dd className="text-sm font-medium tabular-nums">{plannedMinutes > 0 ? formatMinutes(plannedMinutes) : "Nothing yet"}</dd>
        </div>
      </dl>
    </div>
  );
}
