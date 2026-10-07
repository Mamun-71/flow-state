import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { ActualIcon, CalendarIcon, EstimateIcon, FlameIcon, TodayIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { addMonths, type CalendarDay, type MonthCalendar } from "@/lib/calendar";
import { formatDate } from "@/lib/dates";
import { formatMinutes, formatMinutesLong } from "@/lib/time";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Five steps of one hue (the accent): more hours, deeper color. */
const LEVELS = [
  { min: 0, className: "bg-card", label: "No time" },
  { min: 60, className: "bg-primary/[0.08]", label: "Under 1h" },
  { min: 3600, className: "bg-primary/[0.16]", label: "1–3h" },
  { min: 3 * 3600, className: "bg-primary/[0.26]", label: "3–5h" },
  { min: 5 * 3600, className: "bg-primary/[0.38]", label: "5h+" },
];

function levelFor(seconds: number) {
  let level = LEVELS[0];
  for (const l of LEVELS) if (seconds >= l.min) level = l;
  return level;
}

/** The month view: summary tiles and a Monday-first grid of days. */
export function MonthCalendarView({ cal, today }: { cal: MonthCalendar; today: string }) {
  const thisMonth = today.slice(0, 7);
  const month = cal.month;

  // Monday-first grid: blanks before the 1st and after the last day.
  const lead = (new Date(`${cal.firstDay}T00:00:00Z`).getUTCDay() + 6) % 7;
  const trail = (7 - ((lead + cal.days.length) % 7)) % 7;
  const average = cal.elapsedDays ? cal.totalActualSeconds / cal.elapsedDays : 0;
  const planRatio = cal.totalPlannedMinutes ? cal.totalActualSeconds / 60 / cal.totalPlannedMinutes : null;

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={<CalendarIcon className="size-6.5" />}
        eyebrow="Calendar"
        title={formatDate(cal.firstDay, "MMMM yyyy")}
        actions={
          <nav aria-label="Month" className="flex items-center gap-1.5">
            <Link
              href={`/calendar?month=${addMonths(month, -1)}`}
              className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-10 rounded-xl")}
              aria-label="Previous month"
            >
              <ChevronLeftIcon />
            </Link>
            {month !== thisMonth && (
              <Link href="/calendar" className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-xl px-3.5")}>
                This month
              </Link>
            )}
            <Link
              href={`/calendar?month=${addMonths(month, 1)}`}
              className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-10 rounded-xl")}
              aria-label="Next month"
            >
              <ChevronRightIcon />
            </Link>
          </nav>
        }
      />

      <section aria-label="Month summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          icon={<ActualIcon className="size-5" />}
          label="Total actual"
          value={formatMinutes(cal.totalActualSeconds / 60)}
          unit="h"
          featured
        >
          {planRatio === null
            ? "Nothing planned this month"
            : `${Math.round(planRatio * 100)}% of ${formatMinutes(cal.totalPlannedMinutes)}h planned`}
        </Tile>
        <Tile icon={<TodayIcon className="size-5" />} label="Daily average" value={formatMinutes(average / 60)} unit="h">
          {cal.elapsedDays ? `over ${cal.elapsedDays} ${cal.elapsedDays === 1 ? "day" : "days"} so far` : "Month hasn't started"}
        </Tile>
        <Tile
          icon={<EstimateIcon className="size-5" />}
          label="Active days"
          value={String(cal.activeDays)}
          unit={`/ ${cal.elapsedDays || cal.days.length}`}
        >
          {cal.tasksDone} {cal.tasksDone === 1 ? "task" : "tasks"} completed
        </Tile>
        <Tile
          icon={<FlameIcon className="size-5" />}
          label="Best day"
          value={cal.bestDay ? formatMinutes(cal.bestDay.actualSeconds / 60) : "–"}
          unit={cal.bestDay ? "h" : undefined}
        >
          {cal.bestDay ? formatDate(cal.bestDay.date, "EEEE, d MMM") : "No time tracked yet"}
        </Tile>
      </section>

      <section aria-label={`${formatDate(cal.firstDay, "MMMM yyyy")} days`} className="rounded-3xl border bg-card/60 p-2 shadow-xs sm:p-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-2" aria-hidden="true">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase sm:text-xs">
              <span className="sm:hidden">{d.charAt(0)}</span>
              <span className="hidden sm:inline">{d}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: lead }, (_, i) => (
            <div key={`lead-${i}`} aria-hidden="true" />
          ))}
          {cal.days.map((day) => (
            <DayCell key={day.date} day={day} today={today} />
          ))}
          {Array.from({ length: trail }, (_, i) => (
            <div key={`trail-${i}`} aria-hidden="true" />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 px-1 text-xs text-muted-foreground">
          <span>Less</span>
          {LEVELS.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className={cn("size-3.5 rounded-[5px] border border-border/70", l.className)} aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{l.label}</span>
            </span>
          ))}
          <span>More</span>
        </div>
      </section>
    </div>
  );
}

function DayCell({ day, today }: { day: CalendarDay; today: string }) {
  const isToday = day.date === today;
  const isFuture = day.date > today;
  const level = levelFor(day.actualSeconds);
  const hasTime = day.actualSeconds >= 60;
  const over = day.plannedMinutes > 0 && day.actualSeconds / 60 > day.plannedMinutes;
  const progress = day.plannedMinutes ? Math.min(1, day.actualSeconds / 60 / day.plannedMinutes) : 0;
  const label = `${formatDate(day.date, "EEEE d MMMM")}: ${hasTime ? formatMinutesLong(day.actualSeconds / 60) : "no time"} tracked${
    day.plannedMinutes ? ` of ${formatMinutesLong(day.plannedMinutes)} planned` : ""
  }${day.tasksPlanned ? `, ${day.tasksDone} of ${day.tasksPlanned} tasks done` : ""}`;

  return (
    <Link
      href={day.date === today ? "/" : `/?date=${day.date}`}
      aria-label={label}
      title={label}
      className={cn(
        "group relative flex aspect-square flex-col rounded-xl border border-border/60 p-1.5 transition-all outline-none sm:aspect-auto sm:min-h-28 sm:rounded-2xl sm:p-2.5",
        "hover:-translate-y-px hover:border-primary/40 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
        level.className,
        isFuture && !day.tasksPlanned && "opacity-55",
        isToday && "border-primary/60 ring-2 ring-primary/25",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums sm:size-7 sm:text-sm",
            isToday ? "bg-primary text-primary-foreground" : "text-foreground",
          )}
        >
          {Number(day.date.slice(8))}
        </span>
        {day.tasksPlanned > 0 && (
          <span className="hidden text-[11px] text-muted-foreground tabular-nums sm:inline" title="Tasks done / planned">
            {day.tasksDone}/{day.tasksPlanned}
          </span>
        )}
      </div>

      <div className="mt-auto">
        {hasTime ? (
          <>
            <p className="text-center text-[11px] leading-none font-semibold tabular-nums sm:text-left sm:text-base">
              <span className="sm:hidden">{(day.actualSeconds / 3600).toFixed(1)}h</span>
              <span className="hidden sm:inline">{formatMinutesLong(day.actualSeconds / 60)}</span>
            </p>
            {day.plannedMinutes > 0 && (
              <p className="mt-1 hidden text-[11px] text-muted-foreground tabular-nums sm:block">
                of {formatMinutesLong(day.plannedMinutes)}
              </p>
            )}
          </>
        ) : day.plannedMinutes > 0 ? (
          <p className="hidden text-[11px] text-muted-foreground tabular-nums sm:block">{formatMinutesLong(day.plannedMinutes)} planned</p>
        ) : null}
        {day.plannedMinutes > 0 && (
          <div className="mt-1.5 hidden h-1 overflow-hidden rounded-full bg-foreground/10 sm:block" aria-hidden="true">
            <div className={cn("h-full rounded-full", over ? "bg-status-over" : "bg-primary")} style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>
    </Link>
  );
}

function Tile({
  icon,
  label,
  value,
  unit,
  featured,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  featured?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-4 shadow-xs",
        featured && "border-primary/25 bg-gradient-to-br from-primary/[0.09] via-card to-card",
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-lg",
            featured ? "bg-primary/12 text-primary" : "bg-muted text-foreground/70",
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-2.5 text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{children}</p>
    </div>
  );
}
