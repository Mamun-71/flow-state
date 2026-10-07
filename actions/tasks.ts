"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { dateSchema, idSchema, statusSchema, taskSchema, type TaskFormInput } from "@/lib/validation";
import { fail, fromDbError, fromZodError, type ActionResult } from "@/lib/action-result";
import type { TaskStatus } from "@/lib/database.types";
import { zonedDateTime } from "@/lib/dates";

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

async function subcategoryMatches(supabase: Supabase, categoryId: string, subcategoryId: string | null) {
  if (!subcategoryId) return true;
  const { data } = await supabase
    .from("subcategories")
    .select("id")
    .eq("id", subcategoryId)
    .eq("category_id", categoryId)
    .maybeSingle();
  return Boolean(data);
}

const subcategoryMismatch = () =>
  fail("That subcategory doesn't belong to the chosen category.", {
    subcategoryId: "Pick a subcategory of this category",
  });

/**
 * Add (id = null) or edit a task from the task modal. Handles the status change
 * (Done stops the timer; To Do pauses it) and an edited Actual time.
 */
export async function saveTask(id: string | null, input: TaskFormInput): Promise<ActionResult<{ id: string }>> {
  if (id !== null && !idSchema.safeParse(id).success) return fail("Invalid task");
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;
  const { supabase } = await requireUser();

  if (!(await subcategoryMatches(supabase, v.categoryId, v.subcategoryId))) return subcategoryMismatch();

  const fields = {
    title: v.title,
    category_id: v.categoryId,
    subcategory_id: v.subcategoryId,
    description: v.description,
    planned_date: v.plannedDate,
    estimated_minutes: v.estimate,
  };

  let taskId: string;
  let previousStatus: TaskStatus | null = null;

  if (id === null) {
    // New tasks go to the end of their column.
    const { data: last } = await supabase
      .from("tasks")
      .select("sort_order")
      .eq("status", v.status)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        ...fields,
        status: v.status,
        completed_at: v.status === "done" ? new Date().toISOString() : null,
        sort_order: (last?.sort_order ?? -1) + 1,
      })
      .select("id")
      .single();
    if (error) return fromDbError(error, "Couldn't add the task.");
    taskId = data.id;
  } else {
    const { data: current, error: readError } = await supabase.from("tasks").select("status").eq("id", id).single();
    if (readError) return fromDbError(readError, "Couldn't find the task.");
    previousStatus = current.status;
    const { error } = await supabase.from("tasks").update(fields).eq("id", id);
    if (error) return fromDbError(error, "Couldn't save the task.");
    taskId = id;
  }

  // Status change
  if (previousStatus !== null && previousStatus !== v.status) {
    if (v.status === "done") {
      const { error } = await supabase.rpc("complete_task", { p_task_id: taskId });
      if (error) return fromDbError(error, "Couldn't mark the task as done.");
    } else {
      if (v.status === "todo") {
        // A To Do task can't have a running timer.
        await supabase
          .from("time_sessions")
          .update({ ended_at: new Date().toISOString() })
          .eq("task_id", taskId)
          .is("ended_at", null);
      }
      const { error } = await supabase.from("tasks").update({ status: v.status, completed_at: null }).eq("id", taskId);
      if (error) return fromDbError(error, "Couldn't change the status.");
    }
  }

  // Actual time: only when it was edited (or entered for a new task).
  if (v.actualChanged && (id !== null || v.actual > 0)) {
    const { error } = await supabase.rpc("set_task_actual", {
      p_task_id: taskId,
      p_seconds: v.actual * 60,
      p_anchor: zonedDateTime(v.plannedDate, "09:00").toISOString(),
    });
    if (error) {
      if (error.code === "P0001") return fail(error.message, { actualHours: "Pause the timer first" });
      return fromDbError(error, "Saved, but couldn't update the actual time.");
    }
  }

  refresh();
  return { ok: true, data: { id: taskId } };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return fail("Invalid task");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return fromDbError(error, "Couldn't delete the task.");
  refresh();
  return { ok: true };
}

/** Saves a column's order (moving tasks into it) in one atomic call. */
export async function reorderTasks(status: TaskStatus, ids: string[]): Promise<ActionResult> {
  const parsed = z
    .object({ status: z.enum(["todo", "in_progress"]), ids: z.array(idSchema).max(500) })
    .safeParse({ status, ids });
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("reorder_tasks", { p_status: parsed.data.status, p_ids: parsed.data.ids });
  if (error) return fromDbError(error, "Couldn't move the task.");
  refresh();
  return { ok: true };
}

/** Reopen a Done task: In Progress if it has tracked time, otherwise To Do. */
export async function reopenTask(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return fail("Invalid task");
  const { supabase } = await requireUser();
  const { count } = await supabase
    .from("time_sessions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", id);
  const { error } = await supabase
    .from("tasks")
    .update({ status: count ? "in_progress" : "todo", completed_at: null })
    .eq("id", id);
  if (error) return fromDbError(error, "Couldn't reopen the task.");
  refresh();
  return { ok: true };
}

/** "Undo" after Mark as Done: put the task back in its previous column. */
export async function restoreStatus(id: string, status: TaskStatus): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success || !statusSchema.safeParse(status).success) return fail("Invalid task");
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return fromDbError(error);
  refresh();
  return { ok: true };
}

/** "Move to today" for carried-over tasks. */
export async function moveTasksToDate(ids: string[], date: string): Promise<ActionResult> {
  const parsed = z
    .object({ ids: z.array(idSchema).min(1).max(500), date: dateSchema })
    .safeParse({ ids, date });
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({ planned_date: parsed.data.date })
    .in("id", parsed.data.ids)
    .neq("status", "done");
  if (error) return fromDbError(error, "Couldn't move the tasks.");
  refresh();
  return { ok: true };
}
