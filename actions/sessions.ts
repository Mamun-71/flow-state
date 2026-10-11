"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { idSchema, sessionAddSchema, sessionEditSchema, type SessionAddInput, type SessionEditInput } from "@/lib/validation";
import { fail, fromDbError, fromZodError, type ActionResult } from "@/lib/action-result";
import { fromLocalInput } from "@/lib/dates";

/** Start and end from datetime-local inputs: valid, in order, not in the future. */
function parseRange(startedAt: string, endedAt: string): { start: Date; end: Date } | ActionResult {
  const start = fromLocalInput(startedAt);
  const end = fromLocalInput(endedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return fail("Pick valid times");
  if (end <= start) return fail("The end must be after the start.", { endedAt: "Must be after the start" });
  if (end.getTime() > Date.now() + 60_000) {
    return fail("The end can't be in the future.", { endedAt: "Can't be in the future" });
  }
  return { start, end };
}

/** Time worked without the timer: one manual session. */
export async function addSession(input: SessionAddInput): Promise<ActionResult> {
  const parsed = sessionAddSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const range = parseRange(parsed.data.startedAt, parsed.data.endedAt);
  if ("ok" in range) return range;

  const { supabase } = await requireUser();
  const { error } = await supabase.from("time_sessions").insert({
    task_id: parsed.data.taskId,
    started_at: range.start.toISOString(),
    ended_at: range.end.toISOString(),
    source: "manual",
  });
  if (error) return fromDbError(error, "Couldn't add the session.");
  refresh();
  return { ok: true };
}

export async function updateSession(input: SessionEditInput): Promise<ActionResult> {
  const parsed = sessionEditSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const range = parseRange(parsed.data.startedAt, parsed.data.endedAt);
  if ("ok" in range) return range;
  const { start, end } = range;

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("time_sessions")
    .update({ started_at: start.toISOString(), ended_at: end.toISOString() })
    .eq("id", parsed.data.sessionId)
    .not("ended_at", "is", null);
  if (error) return fromDbError(error, "Couldn't save the session.");
  refresh();
  return { ok: true };
}

export async function deleteSession(sessionId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(sessionId).success) return fail("Invalid session");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("time_sessions").delete().eq("id", sessionId);
  if (error) return fromDbError(error, "Couldn't delete the session.");
  refresh();
  return { ok: true };
}
