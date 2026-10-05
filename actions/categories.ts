"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { categorySchema, idSchema, subcategorySchema } from "@/lib/validation";
import { fail, fromDbError, fromZodError, type ActionResult } from "@/lib/action-result";

const taskCountLabel = (n: number) => `${n} ${n === 1 ? "task uses" : "tasks use"} it`;

export async function createCategory(input: { name: string; color: string }): Promise<ActionResult<{ id: string }>> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("categories").insert(parsed.data).select("id").single();
  if (error) return fromDbError(error, "Couldn't add the category.");
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function updateCategory(id: string, input: { name: string; color: string }): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return fail("Invalid category");
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("categories").update(parsed.data).eq("id", id);
  if (error) return fromDbError(error, "Couldn't save the category.");
  refresh();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return fail("Invalid category");
  const { supabase } = await requireUser();
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (count) return fail(`Can't delete: ${taskCountLabel(count)}.`);
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return fromDbError(error, "Couldn't delete the category.");
  refresh();
  return { ok: true };
}

export async function createSubcategory(input: { categoryId: string; name: string }): Promise<ActionResult> {
  const parsed = subcategorySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("subcategories")
    .insert({ category_id: parsed.data.categoryId, name: parsed.data.name });
  if (error) return fromDbError(error, "Couldn't add the subcategory.");
  refresh();
  return { ok: true };
}

export async function renameSubcategory(id: string, name: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return fail("Invalid subcategory");
  const parsed = subcategorySchema.shape.name.safeParse(name);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("subcategories").update({ name: parsed.data }).eq("id", id);
  if (error) return fromDbError(error, "Couldn't rename the subcategory.");
  refresh();
  return { ok: true };
}

export async function deleteSubcategory(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return fail("Invalid subcategory");
  const { supabase } = await requireUser();
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("subcategory_id", id);
  if (count) return fail(`Can't delete: ${taskCountLabel(count)}.`);
  const { error } = await supabase.from("subcategories").delete().eq("id", id);
  if (error) return fromDbError(error, "Couldn't delete the subcategory.");
  refresh();
  return { ok: true };
}
