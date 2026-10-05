import type { Metadata } from "next";
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon, TargetIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { PeriodPicker } from "@/components/period-picker";
import { HoursChart } from "@/components/hours-chart";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { getStats, type EstimationRow } from "@/lib/stats";
import { formatDate, parsePeriod, periodLabel } from "@/lib/dates";
import { formatMinutes } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Statistics" };

export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam);
  const stats = await getStats(period);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Statistics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Last {periodLabel(period)} · {formatDate(stats.startDate, "d MMM")} – {formatDate(stats.endDate, "d MMM yyyy")}
          </p>
        </div>
        <PeriodPicker value={period} />
      </div>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Tracked" value={formatMinutes(stats.totalSeconds / 60)} unit="h">
          <Change ratio={stats.changeRatio} previousSeconds={stats.previousSeconds} />
        </Tile>
        <Tile label="Daily average" value={formatMinutes(stats.dailyAverageSeconds / 60)} unit="h">
          <span className="text-muted-foreground">across {period} days</span>
        </Tile>
        <Tile label="Tasks completed" value={String(stats.tasksCompleted)}>
          <span className="text-muted-foreground">{(stats.tasksCompleted / period).toFixed(1)} per day</span>
        </Tile>
        <Tile
          label="Estimate accuracy"
          value={stats.accuracy === null ? "–" : `${Math.round(stats.accuracy * 100)}%`}
          title="Actual time ÷ estimated time, for tasks completed in this period"
        >
          <AccuracyNote accuracy={stats.accuracy} />
        </Tile>
      </section>

      <Card title="Tracked hours" description="Time is counted on the day it was spent; a session past midnight is split.">
        <HoursChart buckets={stats.buckets} granularity={stats.granularity} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="By category" description="Click a category to see its subcategories.">
          <CategoryBreakdown rows={stats.breakdown} />
        </Card>
        <Card title="Estimation insight" description="Completed tasks with tracked time, by category.">
          <EstimationInsight rows={stats.estimation} />
        </Card>
      </div>
    </div>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4 md:p-5">
      <h2 className="font-medium">{title}</h2>
      {description && <p className="mt-0.5 mb-4 text-xs text-muted-foreground">{description}</p>}
      {children}
    </section>
  );
}

function Tile({
  label,
  value,
  unit,
  title,
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4" title={title}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">
        {value}
        {unit && <span className="ml-0.5 text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>
      <div className="mt-1 text-xs">{children}</div>
    </div>
  );
}

function Change({ ratio, previousSeconds }: { ratio: number | null; previousSeconds: number }) {
  if (ratio === null) return <span className="text-muted-foreground">No data for the previous period</span>;
  const pct = Math.round(ratio * 100);
  const Icon = pct > 0 ? ArrowUpRightIcon : pct < 0 ? ArrowDownRightIcon : MinusIcon;
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Icon className={cn("size-3.5", pct > 0 && "text-status-done")} aria-hidden="true" />
      <span className={cn("font-medium tabular-nums", pct > 0 ? "text-status-done" : "text-foreground")}>
        {pct > 0 ? "+" : ""}
        {pct}%
      </span>
      vs {formatMinutes(previousSeconds / 60)}h before
    </span>
  );
}

function AccuracyNote({ accuracy }: { accuracy: number | null }) {
  if (accuracy === null) return <span className="text-muted-foreground">No completed tasks with time yet</span>;
  const diff = Math.round((accuracy - 1) * 100);
  if (Math.abs(diff) <= 5) return <span className="text-status-done">Right on your estimates</span>;
  return (
    <span className="text-muted-foreground">
      Tasks took {Math.abs(diff)}% {diff > 0 ? "longer" : "less"} than estimated
    </span>
  );
}

function EstimationInsight({ rows }: { rows: EstimationRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Complete a few tasks with tracked time to see where your estimates drift.</p>;
  }
  return (
    <ul className="grid gap-3">
      {rows.map((r) => {
        const diff = Math.round((r.ratio - 1) * 100);
        const kind = diff > 10 ? "under" : diff < -10 ? "over" : "ok";
        const Icon = kind === "under" ? TrendingUpIcon : kind === "over" ? TrendingDownIcon : TargetIcon;
        return (
          <li key={r.id} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                kind === "under" && "bg-status-over/15 text-status-over",
                kind === "over" && "bg-status-todo/15 text-status-todo",
                kind === "ok" && "bg-status-done/15 text-status-done",
              )}
              aria-hidden="true"
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full" style={{ backgroundColor: r.color ?? "var(--status-todo)" }} aria-hidden="true" />
                <span className="font-medium">{r.name}</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {r.tasks} {r.tasks === 1 ? "task" : "tasks"}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {kind === "under" && `You underestimate: tasks take ${diff}% longer than planned.`}
                {kind === "over" && `You overestimate: tasks take ${Math.abs(diff)}% less time than planned.`}
                {kind === "ok" && `Estimates are close (${diff >= 0 ? "+" : ""}${diff}%).`}
                {" "}
                {r.under > 0 && `${r.under} ran over`}
                {r.under > 0 && r.over > 0 && ", "}
                {r.over > 0 && `${r.over} finished early`}
                {(r.under > 0 || r.over > 0) && "."}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

