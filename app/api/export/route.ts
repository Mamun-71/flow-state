import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dayOf, todayStr } from "@/lib/dates";
import { sessionSeconds } from "@/lib/time";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Quote when needed, and neutralize spreadsheet formulas.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  return [columns.join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(","))].join("\r\n");
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const table = request.nextUrl.searchParams.get("table") === "sessions" ? "sessions" : "tasks";

  const [categories, subcategories, tasks, sessions] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("subcategories").select("*").order("name"),
    supabase.from("tasks").select("*").order("planned_date").order("sort_order"),
    supabase.from("time_sessions").select("*").order("started_at"),
  ]);
  for (const r of [categories, subcategories, tasks, sessions]) {
    if (r.error) return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }

  const stamp = todayStr();
  if (format === "json") {
    const body = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        categories: categories.data,
        subcategories: subcategories.data,
        tasks: tasks.data,
        time_sessions: sessions.data,
      },
      null,
      2,
    );
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="flowstate-backup-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const categoryName = new Map(categories.data!.map((c) => [c.id, c.name]));
  const subName = new Map(subcategories.data!.map((s) => [s.id, s.name]));
  const taskById = new Map(tasks.data!.map((t) => [t.id, t]));

  let csv: string;
  if (table === "sessions") {
    const rows = sessions.data!.map((s) => {
      const task = taskById.get(s.task_id);
      return {
        day: dayOf(s.started_at),
        started_at: s.started_at,
        ended_at: s.ended_at,
        minutes: Math.round(sessionSeconds(s.started_at, s.ended_at) / 60),
        source: s.source,
        task: task?.title,
        category: task ? categoryName.get(task.category_id) : "",
        subcategory: task?.subcategory_id ? subName.get(task.subcategory_id) : "",
        task_id: s.task_id,
        session_id: s.id,
      };
    });
    csv = toCsv(rows, ["day", "started_at", "ended_at", "minutes", "source", "task", "category", "subcategory", "task_id", "session_id"]);
  } else {
    const actual = new Map<string, number>();
    for (const s of sessions.data!) actual.set(s.task_id, (actual.get(s.task_id) ?? 0) + sessionSeconds(s.started_at, s.ended_at));
    const rows = tasks.data!.map((t) => ({
      planned_date: t.planned_date,
      title: t.title,
      category: categoryName.get(t.category_id),
      subcategory: t.subcategory_id ? subName.get(t.subcategory_id) : "",
      status: t.status,
      estimated_minutes: t.estimated_minutes,
      actual_minutes: Math.round((actual.get(t.id) ?? 0) / 60),
      completed_at: t.completed_at,
      description: t.description,
      id: t.id,
    }));
    csv = toCsv(rows, ["planned_date", "title", "category", "subcategory", "status", "estimated_minutes", "actual_minutes", "completed_at", "description", "id"]);
  }

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flowstate-${table}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
