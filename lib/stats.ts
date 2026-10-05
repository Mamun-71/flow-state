import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, dayStart, formatDate, periodRange, splitByDay, todayStr, weekStart, type Period } from "@/lib/dates";
import { sessionSeconds } from "@/lib/time";

export type ChartBucket = { key: string; label: string; trackedHours: number; plannedHours: number };

export type BreakdownRow = {
  id: string;
  name: string;
  color: string | null;
  seconds: number;
  share: number;
  subcategories: { id: string; name: string; seconds: number; share: number }[];
};

export type EstimationRow = {
  id: string;
  name: string;
  color: string | null;
  tasks: number;
  ratio: number; // actual ÷ estimated
  under: number; // tasks that took >10% longer than estimated
  over: number; // tasks that took >10% less than estimated
};

export type Stats = {
  period: Period;
  startDate: string;
  endDate: string;
  totalSeconds: number;
  previousSeconds: number;
  changeRatio: number | null;
  dailyAverageSeconds: number;
  tasksCompleted: number;
  accuracy: number | null;
  completedEstimatedMinutes: number;
  completedActualSeconds: number;
  granularity: "day" | "week";
  buckets: ChartBucket[];
  breakdown: BreakdownRow[];
  estimation: EstimationRow[];
};

type SessionRow = {
  started_at: string;
  ended_at: string | null;
  task: { id: string; category_id: string; subcategory_id: string | null } | null;
};

export async function getStats(period: Period): Promise<Stats> {
  const supabase = await createClient();
  const today = todayStr();
  const range = periodRange(period, today);
  const prevStart = dayStart(addDays(range.startDate, -period));

  const [sessionsRes, categoriesRes, plannedRes, completedRes] = await Promise.all([
    // Sessions overlapping [previous period start, end); a running session counts up to now.
    supabase
      .from("time_sessions")
      .select("started_at, ended_at, task:tasks(id, category_id, subcategory_id)")
      .lt("started_at", range.end.toISOString())
      .or(`ended_at.is.null,ended_at.gt.${prevStart.toISOString()}`),
    supabase.from("categories").select("id, name, color, subcategories(id, name)"),
    supabase
      .from("tasks")
      .select("planned_date, estimated_minutes")
      .gte("planned_date", range.startDate)
      .lte("planned_date", range.endDate),
    supabase
      .from("tasks")
      .select("id, category_id, estimated_minutes, time_sessions(started_at, ended_at)")
      .eq("status", "done")
      .gte("completed_at", range.start.toISOString())
      .lt("completed_at", range.end.toISOString()),
  ]);
  for (const r of [sessionsRes, categoriesRes, plannedRes, completedRes]) if (r.error) throw r.error;

  const sessions = (sessionsRes.data ?? []) as unknown as SessionRow[];
  const categories = categoriesRes.data ?? [];
  const now = new Date();

  // ── Tracked time per day and per category ─────────────────
  const perDay = new Map<string, number>();
  const perCategory = new Map<string, number>();
  const perSubcategory = new Map<string, number>(); // key: `${categoryId}:${subId | "none"}`
  let totalSeconds = 0;
  let previousSeconds = 0;

  for (const s of sessions) {
    const end = s.ended_at ? new Date(s.ended_at) : now;
    const start = new Date(s.started_at);
    for (const part of splitByDay(start, end, range.start, range.end)) {
      perDay.set(part.day, (perDay.get(part.day) ?? 0) + part.seconds);
      totalSeconds += part.seconds;
      if (s.task) {
        perCategory.set(s.task.category_id, (perCategory.get(s.task.category_id) ?? 0) + part.seconds);
        const subKey = `${s.task.category_id}:${s.task.subcategory_id ?? "none"}`;
        perSubcategory.set(subKey, (perSubcategory.get(subKey) ?? 0) + part.seconds);
      }
    }
    for (const part of splitByDay(start, end, prevStart, range.start)) previousSeconds += part.seconds;
  }

  // ── Planned (estimated) minutes per day ───────────────────
  const plannedPerDay = new Map<string, number>();
  for (const t of plannedRes.data ?? []) {
    plannedPerDay.set(t.planned_date, (plannedPerDay.get(t.planned_date) ?? 0) + t.estimated_minutes);
  }

  // ── Chart buckets: per day up to 30 days, per week beyond ─
  const granularity = period <= 30 ? "day" : "week";
  const buckets = new Map<string, ChartBucket>();
  for (let day = range.startDate; day <= range.endDate; day = addDays(day, 1)) {
    const key = granularity === "day" ? day : weekStart(day);
    const bucket =
      buckets.get(key) ??
      {
        key,
        label:
          granularity === "day"
            ? formatDate(day, period <= 7 ? "EEE d" : "d MMM")
            : formatDate(key < range.startDate ? range.startDate : key, "d MMM"),
        trackedHours: 0,
        plannedHours: 0,
      };
    bucket.trackedHours += (perDay.get(day) ?? 0) / 3600;
    bucket.plannedHours += (plannedPerDay.get(day) ?? 0) / 60;
    buckets.set(key, bucket);
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  const bucketList = [...buckets.values()].map((b) => ({
    ...b,
    trackedHours: round(b.trackedHours),
    plannedHours: round(b.plannedHours),
  }));

  // ── Breakdown by category / subcategory ───────────────────
  const breakdown: BreakdownRow[] = categories
    .map((c) => {
      const seconds = perCategory.get(c.id) ?? 0;
      const subs = [
        ...(c.subcategories ?? []).map((s) => ({ id: s.id, name: s.name, seconds: perSubcategory.get(`${c.id}:${s.id}`) ?? 0 })),
        { id: `${c.id}:none`, name: "No subcategory", seconds: perSubcategory.get(`${c.id}:none`) ?? 0 },
      ]
        .filter((s) => s.seconds > 0)
        .sort((a, b) => b.seconds - a.seconds)
        .map((s) => ({ ...s, share: seconds ? s.seconds / seconds : 0 }));
      return { id: c.id, name: c.name, color: c.color, seconds, share: totalSeconds ? seconds / totalSeconds : 0, subcategories: subs };
    })
    .filter((c) => c.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);

  // ── Completed tasks: accuracy and estimation insight ──────
  const completed = (completedRes.data ?? []).map((t) => ({
    categoryId: t.category_id,
    estimated: t.estimated_minutes,
    actualSeconds: (t.time_sessions ?? []).reduce((sum, s) => sum + sessionSeconds(s.started_at, s.ended_at), 0),
  }));
  // Tasks marked done with no time tracked would skew accuracy, so leave them out.
  const measured = completed.filter((t) => t.actualSeconds > 0);
  const completedEstimatedMinutes = measured.reduce((a, t) => a + t.estimated, 0);
  const completedActualSeconds = measured.reduce((a, t) => a + t.actualSeconds, 0);

  const byCategory = new Map<string, { est: number; act: number; tasks: number; under: number; over: number }>();
  for (const t of measured) {
    const row = byCategory.get(t.categoryId) ?? { est: 0, act: 0, tasks: 0, under: 0, over: 0 };
    const ratio = t.actualSeconds / 60 / t.estimated;
    row.est += t.estimated;
    row.act += t.actualSeconds / 60;
    row.tasks += 1;
    if (ratio > 1.1) row.under += 1;
    else if (ratio < 0.9) row.over += 1;
    byCategory.set(t.categoryId, row);
  }
  const estimation: EstimationRow[] = [...byCategory.entries()]
    .map(([id, r]) => {
      const c = categories.find((x) => x.id === id);
      return { id, name: c?.name ?? "Unknown", color: c?.color ?? null, tasks: r.tasks, ratio: r.act / r.est, under: r.under, over: r.over };
    })
    .sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1));

  return {
    period,
    startDate: range.startDate,
    endDate: range.endDate,
    totalSeconds,
    previousSeconds,
    changeRatio: previousSeconds > 0 ? (totalSeconds - previousSeconds) / previousSeconds : null,
    dailyAverageSeconds: totalSeconds / period,
    tasksCompleted: completed.length,
    accuracy: completedEstimatedMinutes > 0 ? completedActualSeconds / 60 / completedEstimatedMinutes : null,
    completedEstimatedMinutes,
    completedActualSeconds,
    granularity,
    buckets: bucketList,
    breakdown,
    estimation,
  };
}
