import { z } from "zod";
import { parseDuration } from "@/lib/time";

const uuid = z.uuid();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

/** "1:30" → 90. Shared by the client form and the Server Action. */
export const durationField = (max = 1440) =>
  z
    .string()
    .trim()
    .min(1, "Enter a time, e.g. 1:30")
    .transform((value, ctx) => {
      const minutes = parseDuration(value);
      if (minutes === null) {
        ctx.addIssue({ code: "custom", message: "Use HH:MM, e.g. 1:30" });
        return z.NEVER;
      }
      if (minutes < 1 || minutes > max) {
        ctx.addIssue({ code: "custom", message: `Between 0:01 and ${Math.floor(max / 60)}:${String(max % 60).padStart(2, "0")}` });
        return z.NEVER;
      }
      return minutes;
    });

const optionalUuid = z
  .union([uuid, z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v ? v : null));

export const taskSchema = z.object({
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
  estimate: durationField(),
});
export type TaskFormInput = z.input<typeof taskSchema>;
export type TaskFormValues = z.output<typeof taskSchema>;

export const manualTimeSchema = z.object({
  taskId: uuid,
  date: dateStr,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time"),
  duration: durationField(),
});
export type ManualTimeInput = z.input<typeof manualTimeSchema>;

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
