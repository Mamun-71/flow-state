"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation";
import { fail, fromDbError, type ActionResult } from "@/lib/action-result";

export async function startTimer(taskId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(taskId).success) return fail("Invalid task");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("start_timer", { p_task_id: taskId });
  if (error) return fromDbError(error, "Couldn't start the timer.");
  refresh();
  return { ok: true };
}

export async function pauseTimer(): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("pause_timer");
  if (error) return fromDbError(error, "Couldn't pause the timer.");
  refresh();
  return { ok: true };
}

export async function completeTask(taskId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(taskId).success) return fail("Invalid task");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("complete_task", { p_task_id: taskId });
  if (error) return fromDbError(error, "Couldn't mark the task as done.");
  refresh();
  return { ok: true };
}

/** For a forgotten timer: stop it at a chosen time (never in the future). */
export async function stopTimerAt(endedAtIso: string): Promise<ActionResult> {
  const endedAt = new Date(endedAtIso);
  if (Number.isNaN(endedAt.getTime())) return fail("Pick a valid end time");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("stop_timer_at", { p_ended_at: endedAt.toISOString() });
  if (error) return fromDbError(error, "Couldn't stop the timer.");
  refresh();
  return { ok: true };
}
