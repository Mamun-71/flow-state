import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, dayStart, splitByDay } from "@/lib/dates";
import { sessionSeconds } from "@/lib/time";
import type { Category, Subcategory, Task, TimeSession } from "@/lib/database.types";

export type CategoryWithSubs = Category & { subcategories: Subcategory[] };

export type TaskView = Task & {
  category: { id: string; name: string; color: string | null } | null;
  subcategory: { id: string; name: string } | null;
  /** Seconds from finished sessions. */
  trackedSeconds: number;
  /** Start of the running session, if this task's timer is running. */
  runningSince: string | null;
  sessions: TimeSession[];
};

export type RunningTimer = {
  sessionId: string;
  startedAt: string;
  task: { id: string; title: string; estimated_minutes: number; categoryColor: string | null };
  /** Seconds from the task's earlier, finished sessions. */
  previousSeconds: number;
};

const TASK_SELECT = "*, category:categories(id, name, color), subcategory:subcategories(id, name)";

export async function getCategories(): Promise<CategoryWithSubs[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*, subcategories(*)")
    .order("name")
    .order("name", { referencedTable: "subcategories" });
  if (error) throw error;
  return data as CategoryWithSubs[];
}

export async function getCategoryUsage(): Promise<{ categories: Record<string, number>; subcategories: Record<string, number> }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select("category_id, subcategory_id");
  if (error) throw error;
  const categories: Record<string, number> = {};
  const subcategories: Record<string, number> = {};
  for (const t of data) {
    categories[t.category_id] = (categories[t.category_id] ?? 0) + 1;
    if (t.subcategory_id) subcategories[t.subcategory_id] = (subcategories[t.subcategory_id] ?? 0) + 1;
  }
  return { categories, subcategories };
}

/** The running timer plus the server's clock, so the browser can correct for a wrong local clock. */
export async function getTimerState(): Promise<{ running: RunningTimer | null; serverNow: number }> {
  const running = await getRunningTimer();
  return { running, serverNow: Date.now() };
}

export async function getRunningTimer(): Promise<RunningTimer | null> {
  const supabase = await createClient();
  const { data: running } = await supabase
    .from("time_sessions")
    .select("id, started_at, task:tasks(id, title, estimated_minutes, category:categories(color))")
    .is("ended_at", null)
    .maybeSingle();
  if (!running?.task) return null;

  const task = running.task as unknown as {
    id: string;
    title: string;
    estimated_minutes: number;
    category: { color: string | null } | null;
  };
  const { data: previous } = await supabase
    .from("time_sessions")
    .select("started_at, ended_at")
    .eq("task_id", task.id)
    .not("ended_at", "is", null);

  return {
    sessionId: running.id,
    startedAt: running.started_at,
    task: { id: task.id, title: task.title, estimated_minutes: task.estimated_minutes, categoryColor: task.category?.color ?? null },
    previousSeconds: (previous ?? []).reduce((sum, s) => sum + sessionSeconds(s.started_at, s.ended_at), 0),
  };
}

async function withSessions(tasks: Task[]): Promise<TaskView[]> {
  if (tasks.length === 0) return [];
  const supabase = await createClient();
  const { data: sessions, error } = await supabase
    .from("time_sessions")
    .select("*")
    .in("task_id", tasks.map((t) => t.id))
    .order("started_at", { ascending: false });
  if (error) throw error;

  const byTask = new Map<string, TimeSession[]>();
  for (const s of sessions) {
    const list = byTask.get(s.task_id) ?? [];
    list.push(s);
    byTask.set(s.task_id, list);
  }

  return tasks.map((task) => {
    const list = byTask.get(task.id) ?? [];
    const running = list.find((s) => !s.ended_at);
    return {
      ...(task as TaskView),
      sessions: list,
      runningSince: running?.started_at ?? null,
      trackedSeconds: list
        .filter((s) => s.ended_at)
        .reduce((sum, s) => sum + sessionSeconds(s.started_at, s.ended_at), 0),
    };
  });
}

export type DayBoard = {
  tasks: TaskView[];
  carriedOver: TaskView[];
  /** Seconds tracked during this day (any task), running timer counted up to now. */
  trackedSeconds: number;
  /** Start of a running session overlapping this day, so the header can tick live. */
  runningSince: string | null;
  /** Seconds of the running session already counted in trackedSeconds. */
  runningCountedSeconds: number;
  plannedMinutes: number;
};

export async function getDayBoard(date: string, includeCarriedOver: boolean): Promise<DayBoard> {
  const supabase = await createClient();
  const start = dayStart(date);
  const end = dayStart(addDays(date, 1));

  const [dayTasks, carried, daySessions] = await Promise.all([
    supabase.from("tasks").select(TASK_SELECT).eq("planned_date", date).order("sort_order").order("created_at"),
    includeCarriedOver
      ? supabase
          .from("tasks")
          .select(TASK_SELECT)
          .lt("planned_date", date)
          .neq("status", "done")
          .order("planned_date")
          .order("sort_order")
      : Promise.resolve({ data: [] as Task[], error: null }),
    supabase
      .from("time_sessions")
      .select("started_at, ended_at")
      .lt("started_at", end.toISOString())
      .or(`ended_at.is.null,ended_at.gt.${start.toISOString()}`),
  ]);
  if (dayTasks.error) throw dayTasks.error;
  if (carried.error) throw carried.error;
  if (daySessions.error) throw daySessions.error;

  const now = new Date();
  let trackedSeconds = 0;
  let runningSince: string | null = null;
  let runningCountedSeconds = 0;
  for (const s of daySessions.data) {
    const sEnd = s.ended_at ? new Date(s.ended_at) : now;
    const seconds = splitByDay(new Date(s.started_at), sEnd, start, end).reduce((a, p) => a + p.seconds, 0);
    trackedSeconds += seconds;
    if (!s.ended_at && now < end) {
      runningSince = s.started_at;
      runningCountedSeconds = seconds;
    }
  }

  const [tasks, carriedOver] = await Promise.all([
    withSessions(dayTasks.data as Task[]),
    withSessions((carried.data ?? []) as Task[]),
  ]);

  return {
    tasks,
    carriedOver,
    trackedSeconds,
    runningSince,
    runningCountedSeconds,
    plannedMinutes: tasks.reduce((sum, t) => sum + t.estimated_minutes, 0),
  };
}
