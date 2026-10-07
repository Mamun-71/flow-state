import { z } from "zod";

const uuid = z.uuid();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

const optionalUuid = z
  .union([uuid, z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v ? v : null));

/** An HH or MM box: empty means 0. */
const timePart = (max: number, label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{0,3}$/, `${label}: numbers only`)
    .transform((v) => (v === "" ? 0 : Number(v)))
    .refine((n) => n <= max, `${label}: up to ${max}`);

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;

/** The Add / Edit task form. Shared by the client form and the Server Action. */
export const taskSchema = z
  .object({
    title: z.string().trim().min(1, "Give the task a title").max(120, "Up to 120 characters"),
    categoryId: uuid.or(z.literal("")).refine((v) => v !== "", "Pick a category"),
    subcategoryId: optionalUuid,
    description: z
      .string()
      .trim()
      .max(2000, "Up to 2000 characters")
      .optional()
      .transform((v) => (v ? v : null)),
    plannedDate: dateStr,
    status: z.enum(TASK_STATUSES),
    estimateHours: timePart(24, "Hours"),
    estimateMinutes: timePart(59, "Minutes"),
    actualHours: timePart(99, "Hours"),
    actualMinutes: timePart(59, "Minutes"),
    /** Only when the user changed Actual time; otherwise the tracked time is kept as is. */
    actualChanged: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const estimate = v.estimateHours * 60 + v.estimateMinutes;
    if (estimate < 1 || estimate > 1440) {
      ctx.addIssue({ code: "custom", path: ["estimateHours"], message: "Estimate must be between 0:01 and 24:00" });
    }
  })
  .transform(({ estimateHours, estimateMinutes, actualHours, actualMinutes, ...rest }) => ({
    ...rest,
    estimate: estimateHours * 60 + estimateMinutes,
    actual: actualHours * 60 + actualMinutes,
  }));
export type TaskFormInput = z.input<typeof taskSchema>;
export type TaskFormValues = z.output<typeof taskSchema>;

export const sessionEditSchema = z
  .object({
    sessionId: uuid,
    startedAt: z.string().min(1, "Pick a start"),
    endedAt: z.string().min(1, "Pick an end"),
  });
export type SessionEditInput = z.input<typeof sessionEditSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(60, "Up to 60 characters"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a color"),
});

export const subcategorySchema = z.object({
  categoryId: uuid,
  name: z.string().trim().min(1, "Enter a name").max(60, "Up to 60 characters"),
});

export const idSchema = uuid;
export const statusSchema = z.enum(["todo", "in_progress", "done"]);
export const dateSchema = dateStr;
