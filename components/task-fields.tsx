"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryWithSubs } from "@/lib/data";
import type { TaskFormInput } from "@/lib/validation";
import { cn } from "@/lib/utils";

type FieldProps = {
  register: UseFormRegister<TaskFormInput>;
  errors: FieldErrors<TaskFormInput>;
  idPrefix: string;
};

export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

export function CategorySelect({
  register,
  errors,
  idPrefix,
  categories,
  className,
  hideLabel,
}: FieldProps & { categories: CategoryWithSubs[]; className?: string; hideLabel?: boolean }) {
  const id = `${idPrefix}-category`;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className={cn(hideLabel && "sr-only")}>
        Category
      </Label>
      <NativeSelect
        id={id}
        aria-invalid={Boolean(errors.categoryId)}
        aria-describedby={errors.categoryId ? `${id}-error` : undefined}
        {...register("categoryId")}
      >
        <option value="" disabled>
          Category
        </option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </NativeSelect>
      <FieldError id={`${id}-error`} message={errors.categoryId?.message} />
    </div>
  );
}

export function SubcategorySelect({
  register,
  errors,
  idPrefix,
  category,
  className,
}: FieldProps & { category: CategoryWithSubs | undefined; className?: string }) {
  const id = `${idPrefix}-subcategory`;
  const subs = category?.subcategories ?? [];
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>Subcategory</Label>
      <NativeSelect id={id} disabled={subs.length === 0} aria-invalid={Boolean(errors.subcategoryId)} {...register("subcategoryId")}>
        <option value="">{subs.length ? "None" : "No subcategories"}</option>
        {subs.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </NativeSelect>
      <FieldError message={errors.subcategoryId?.message} />
    </div>
  );
}

export function DateInput({ register, errors, idPrefix, className }: FieldProps & { className?: string }) {
  const id = `${idPrefix}-date`;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>Planned for</Label>
      <Input id={id} type="date" className="h-10" aria-invalid={Boolean(errors.plannedDate)} {...register("plannedDate")} />
      <FieldError message={errors.plannedDate?.message} />
    </div>
  );
}

export function DescriptionInput({ register, errors, idPrefix, className }: FieldProps & { className?: string }) {
  const id = `${idPrefix}-description`;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>Notes</Label>
      <Textarea id={id} rows={3} maxLength={2000} placeholder="Optional" aria-invalid={Boolean(errors.description)} {...register("description")} />
      <FieldError message={errors.description?.message} />
    </div>
  );
}
