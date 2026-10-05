"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin, requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, fromDbError, fromZodError, type ActionResult } from "@/lib/action-result";

const newUserSchema = z.object({
  email: z.email("Enter a valid email"),
  displayName: z.string().trim().max(80, "Up to 80 characters").optional(),
  password: z.string().min(8, "Use at least 8 characters").max(72, "Up to 72 characters"),
});

/** Super admin only: create a confirmed account with a temporary password. */
export async function createUser(input: z.input<typeof newUserSchema>): Promise<ActionResult> {
  const parsed = newUserSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await requireSuperAdmin();
  } catch {
    return fail("Only the super admin can add users.");
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return fail("The server is missing SUPABASE_SECRET_KEY. Add it to the environment variables.");
  }

  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: parsed.data.displayName ? { display_name: parsed.data.displayName } : {},
  });
  if (error) {
    console.error(error);
    if (error.status === 422 || /already/i.test(error.message)) {
      return fail("A user with this email already exists.", { email: "Already registered" });
    }
    return fail("Couldn't create the user.");
  }

  refresh();
  return { ok: true };
}

/** Any user: change their own display name. */
export async function updateDisplayName(name: string): Promise<ActionResult> {
  const parsed = z.string().trim().max(80, "Up to 80 characters").safeParse(name);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data || null })
    .eq("id", userId);
  if (error) return fromDbError(error, "Couldn't save your name.");
  refresh();
  return { ok: true };
}
