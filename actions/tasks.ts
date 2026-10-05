"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { dateSchema, idSchema, statusSchema, taskSchema, type TaskFormInput } from "@/lib/validation";
import { fail, fromDbError, fromZodError, type ActionResult } from "@/lib/action-result";
import type { TaskStatus } from "@/lib/database.types";

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

export async function createTask(input: TaskFormInput): Promise<ActionResult<{ id: string }>> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;
  const { supabase } = await requireUser();

  if (!(await subcategoryMatches(supabase, v.categoryId, v.subcategoryId))) return subcategoryMismatch();

  // New tasks go to the end of the To Do column.
  const { data: last } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("status", "todo")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: v.title,
      category_id: v.categoryId,
      subcategory_id: v.subcategoryId,
      description: v.description,
      planned_date: v.plannedDate,
      estimated_minutes: v.estimate,
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error) return fromDbError(error, "Couldn't add the task.");

  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function updateTask(id: string, input: TaskFormInput): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return fail("Invalid task");
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;
  const { supabase } = await requireUser();

  if (!(await subcategoryMatches(supabase, v.categoryId, v.subcategoryId))) return subcategoryMismatch();

  const { error } = await supabase
    .from("tasks")
    .update({
      title: v.title,
      category_id: v.categoryId,
      subcategory_id: v.subcategoryId,
      description: v.description,
      planned_date: v.plannedDate,
      estimated_minutes: v.estimate,
    })
    .eq("id", id);
  if (error) return fromDbError(error, "Couldn't save the task.");

  refresh();
  return { ok: true };
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
