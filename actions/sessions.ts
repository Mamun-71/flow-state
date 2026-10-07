"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { idSchema, sessionEditSchema, type SessionEditInput } from "@/lib/validation";
import { fail, fromDbError, fromZodError, type ActionResult } from "@/lib/action-result";
import { fromLocalInput } from "@/lib/dates";

export async function updateSession(input: SessionEditInput): Promise<ActionResult> {
  const parsed = sessionEditSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const start = fromLocalInput(parsed.data.startedAt);
  const end = fromLocalInput(parsed.data.endedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return fail("Pick valid times");
  if (end <= start) return fail("The end must be after the start.", { endedAt: "Must be after the start" });
  if (end.getTime() > Date.now() + 60_000) {
    return fail("The end can't be in the future.", { endedAt: "Can't be in the future" });
  }

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
