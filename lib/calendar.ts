import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, dayStart, diffDays, splitByDay, todayStr } from "@/lib/dates";

export type CalendarDay = {
  date: string;
  /** Seconds actually tracked on this day (any task). */
  actualSeconds: number;
  /** Sum of estimates of tasks planned for this day. */
  plannedMinutes: number;
  tasksPlanned: number;
  tasksDone: number;
};

export type MonthCalendar = {
  month: string; // "yyyy-MM"
  firstDay: string;
  lastDay: string;
  days: CalendarDay[];
  totalActualSeconds: number;
  totalPlannedMinutes: number;
  activeDays: number;
  /** Days of this month up to today (the whole month if it's in the past). */
  elapsedDays: number;
  tasksDone: number;
  bestDay: CalendarDay | null;
};

export function isMonthStr(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export async function getMonthCalendar(month: string): Promise<MonthCalendar> {
  const supabase = await createClient();
  const firstDay = `${month}-01`;
  const lastDay = addDays(`${addMonths(month, 1)}-01`, -1);
  const start = dayStart(firstDay);
  const end = dayStart(addDays(lastDay, 1));

  const [sessionsRes, tasksRes] = await Promise.all([
    supabase
      .from("time_sessions")
      .select("started_at, ended_at")
      .lt("started_at", end.toISOString())
      .or(`ended_at.is.null,ended_at.gt.${start.toISOString()}`),
    supabase
      .from("tasks")
      .select("planned_date, estimated_minutes, status")
      .gte("planned_date", firstDay)
      .lte("planned_date", lastDay),
  ]);
  if (sessionsRes.error) throw sessionsRes.error;
  if (tasksRes.error) throw tasksRes.error;

  const byDay = new Map<string, CalendarDay>();
  for (let d = firstDay; d <= lastDay; d = addDays(d, 1)) {
    byDay.set(d, { date: d, actualSeconds: 0, plannedMinutes: 0, tasksPlanned: 0, tasksDone: 0 });
  }

  const now = new Date();
  for (const s of sessionsRes.data) {
    const sEnd = s.ended_at ? new Date(s.ended_at) : now;
    for (const part of splitByDay(new Date(s.started_at), sEnd, start, end)) {
      const day = byDay.get(part.day);
      if (day) day.actualSeconds += part.seconds;
    }
  }
  for (const t of tasksRes.data) {
    const day = byDay.get(t.planned_date);
    if (!day) continue;
    day.plannedMinutes += t.estimated_minutes;
    day.tasksPlanned += 1;
    if (t.status === "done") day.tasksDone += 1;
  }

  const days = [...byDay.values()];
  const today = todayStr();
  const elapsedDays =
    today < firstDay ? 0 : today > lastDay ? days.length : diffDays(today, firstDay) + 1;
  const bestDay = days.reduce<CalendarDay | null>(
    (best, d) => (d.actualSeconds > (best?.actualSeconds ?? 0) ? d : best),
    null,
  );

  return {
    month,
    firstDay,
    lastDay,
    days,
    totalActualSeconds: days.reduce((s, d) => s + d.actualSeconds, 0),
    totalPlannedMinutes: days.reduce((s, d) => s + d.plannedMinutes, 0),
    activeDays: days.filter((d) => d.actualSeconds >= 60).length,
    elapsedDays,
    tasksDone: days.reduce((s, d) => s + d.tasksDone, 0),
    bestDay,
  };
}
