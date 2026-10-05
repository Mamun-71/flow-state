"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategorySelect, DateInput, DescriptionInput, EstimateInput, FieldError, SubcategorySelect } from "@/components/task-fields";
import { taskSchema, type TaskFormInput, type TaskFormValues } from "@/lib/validation";
import type { CategoryWithSubs } from "@/lib/data";
import { cn } from "@/lib/utils";

const LAST_CATEGORY_KEY = "flowstate:last-category";

export const QUICK_ADD_INPUT_ID = "quick-add-title";

export function QuickAdd({
  date,
  categories,
  onAdd,
}: {
  date: string;
  categories: CategoryWithSubs[];
  onAdd: (input: TaskFormInput, values: TaskFormValues) => void;
}) {
  const [more, setMore] = useState(false);
  const form = useForm<TaskFormInput, unknown, TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", categoryId: "", subcategoryId: "", description: "", plannedDate: date, estimate: "" },
  });
  const { register, handleSubmit, formState, control, setValue, reset, getValues } = form;
  const categoryId = useWatch({ control, name: "categoryId" });
  const category = categories.find((c) => c.id === categoryId);

  // Follow the board's date, and remember the last category used.
  useEffect(() => setValue("plannedDate", date), [date, setValue]);
  useEffect(() => {
    try {
      const last = localStorage.getItem(LAST_CATEGORY_KEY);
      if (last && categories.some((c) => c.id === last)) setValue("categoryId", last);
      else if (categories.length === 1) setValue("categoryId", categories[0].id);
    } catch {}
  }, [categories, setValue]);
  useEffect(() => setValue("subcategoryId", ""), [categoryId, setValue]);

  if (categories.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card/50 p-5 text-sm">
        <p className="font-medium">Start with a category</p>
        <p className="mt-1 text-muted-foreground">Tasks belong to a category, like Study, Work or Health.</p>
        <Button className="mt-3" render={<Link href="/categories" />} nativeButton={false}>
          Create a category
        </Button>
      </div>
    );
  }

  const submit = handleSubmit((values) => {
    const input = getValues();
    try {
      localStorage.setItem(LAST_CATEGORY_KEY, values.categoryId);
    } catch {}
    onAdd(input, values);
    reset({ ...input, title: "", description: "", estimate: "" }, { keepDefaultValues: true });
    document.getElementById(QUICK_ADD_INPUT_ID)?.focus();
  });

  const fieldProps = { register, errors: formState.errors, idPrefix: "quick" };

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-card p-3 shadow-xs md:p-4" aria-label="Add a task">
      <div className="flex flex-col gap-2 md:flex-row md:items-start">
        <div className="grid flex-1 gap-1.5">
          <label htmlFor={QUICK_ADD_INPUT_ID} className="sr-only">
            Task title
          </label>
          <Input
            id={QUICK_ADD_INPUT_ID}
            placeholder="Add a task…  (press N)"
            autoComplete="off"
            maxLength={120}
            className="h-9"
            aria-invalid={Boolean(formState.errors.title)}
            {...register("title")}
          />
          <FieldError message={formState.errors.title?.message} />
        </div>
        <div className="flex gap-2">
          <CategorySelect {...fieldProps} categories={categories} hideLabel className="flex-1 md:w-40 md:flex-none" />
          <EstimateInput {...fieldProps} hideLabel className="w-20" />
          <Button type="submit" className="h-9 px-3" aria-label="Add task">
            <PlusIcon />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setMore((v) => !v)}
        aria-expanded={more}
        className="mt-2 inline-flex items-center gap-1 rounded-md px-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        More
        <ChevronDownIcon className={cn("size-3.5 transition-transform", more && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {more && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 pt-3 sm:grid-cols-2">
              <SubcategorySelect {...fieldProps} category={category} />
              <DateInput {...fieldProps} />
              <DescriptionInput {...fieldProps} className="sm:col-span-2" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
