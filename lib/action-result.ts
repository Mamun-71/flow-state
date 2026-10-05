import type { PostgrestError } from "@supabase/supabase-js";
import type { z } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function fail(error: string, fieldErrors?: Record<string, string>): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  return { ok: false, error, fieldErrors };
}

export function fromZodError(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fail(error.issues[0]?.message ?? "Invalid input", fieldErrors);
}

/** Turns a database error into a short, human message. */
export function fromDbError(error: PostgrestError, fallback = "Something went wrong. Please try again.") {
  console.error(error);
  if (error.code === "23505") return fail("That name is already used.");
  if (error.code === "23503") return fail("It's still in use, so it can't be changed that way.");
  if (error.code === "23514") return fail("Those values aren't valid.");
  return fail(fallback);
}
