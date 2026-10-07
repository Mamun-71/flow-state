"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, ChevronDownIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { saveTask } from "@/actions/tasks";
import { deleteSession, updateSession } from "@/actions/sessions";
import { useTaskSeconds } from "@/hooks/use-elapsed";
import { useTimer } from "@/components/timer-provider";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategorySelect, DateInput, DescriptionInput, FieldError, SubcategorySelect } from "@/components/task-fields";
import { DurationInput } from "@/components/duration-input";
import { ActualIcon, AddTaskIcon, EstimateIcon } from "@/components/icons";
import { taskSchema, type TaskFormInput, type TaskFormValues } from "@/lib/validation";
import { dayOf, formatDayLabel, formatTime, toLocalInput } from "@/lib/dates";
import { formatClock, formatMinutesLong, sessionSeconds } from "@/lib/time";
import type { CategoryWithSubs, TaskView } from "@/lib/data";
import type { TaskStatus, TimeSession } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { safe } from "@/lib/safe";

export const LAST_CATEGORY_KEY = "flowstate:last-category";

const STATUS_OPTIONS: { value: TaskStatus; label: string; dot: string; active: string }[] = [
  { value: "todo", label: "To Do", dot: "bg-status-todo", active: "border-status-todo/50 bg-status-todo/10 text-foreground" },
  { value: "in_progress", label: "In Progress", dot: "bg-status-progress", active: "border-status-progress/50 bg-status-progress/10 text-foreground" },
  { value: "done", label: "Done", dot: "bg-status-done", active: "border-status-done/50 bg-status-done/12 text-foreground" },
];

const pad = (n: number) => String(n).padStart(2, "0");

function splitMinutes(total: number) {
  const m = Math.max(0, Math.round(total));
  return { h: String(Math.floor(m / 60)), m: pad(m % 60) };
}

function readLastCategory(categories: CategoryWithSubs[]) {
  try {
    const last = localStorage.getItem(LAST_CATEGORY_KEY);
    if (last && categories.some((c) => c.id === last)) return last;
  } catch {}
  return categories.length === 1 ? categories[0].id : "";
}

/** One modal for adding and editing a task. `task` undefined means "Add". */
export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultDate,
  categories,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskView | undefined;
  defaultDate: string;
  categories: CategoryWithSubs[];
  onDelete?: (task: TaskView) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        {open && (
          <TaskForm
            key={task?.id ?? `new-${defaultDate}`}
            task={task}
            defaultDate={defaultDate}
            categories={categories}
            onDone={() => onOpenChange(false)}
            onDelete={onDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({
  task,
  defaultDate,
  categories,
  onDone,
  onDelete,
}: {
  task: TaskView | undefined;
  defaultDate: string;
  categories: CategoryWithSubs[];
  onDone: () => void;
  onDelete?: (task: TaskView) => void;
}) {
  const isEdit = Boolean(task);
  const [pending, startTransition] = useTransition();
  const { running } = useTimer();
  const isRunning = Boolean(task && running?.task.id === task.id);
  const live = useTaskSeconds(task?.id ?? "", task?.trackedSeconds ?? 0);

  const estimate = splitMinutes(task?.estimated_minutes ?? 0);
  const actual = splitMinutes((task?.trackedSeconds ?? 0) / 60);

  const { register, handleSubmit, formState, control, setValue, getValues, setError } = useForm<
    TaskFormInput,
    unknown,
    TaskFormValues
  >({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      categoryId: task?.category_id ?? readLastCategory(categories),
      subcategoryId: task?.subcategory_id ?? "",
      description: task?.description ?? "",
      plannedDate: task?.planned_date ?? defaultDate,
      status: task?.status ?? "todo",
      estimateHours: task ? estimate.h : "",
      estimateMinutes: task ? estimate.m : "",
      actualHours: task ? actual.h : "",
      actualMinutes: task ? actual.m : "",
      actualChanged: false,
    },
  });
  const categoryId = useWatch({ control, name: "categoryId" });
  const status = useWatch({ control, name: "status" });
  const category = categories.find((c) => c.id === categoryId);
  const errors = formState.errors;

  // Clear the subcategory when it doesn't belong to the newly chosen category.
  useEffect(() => {
    const sub = getValues("subcategoryId");
    if (sub && !category?.subcategories.some((s) => s.id === sub)) setValue("subcategoryId", "");
  }, [category, getValues, setValue]);

  if (categories.length === 0) {
    return (
      <div className="p-6">
        <DialogTitle className="text-lg">Create a category first</DialogTitle>
        <DialogDescription className="mt-1">Every task belongs to a category, like Study, Work or Health.</DialogDescription>
        <Link href="/categories" className={cn(buttonVariants(), "mt-5 h-10 px-4")} onClick={onDone}>
          Go to Categories
        </Link>
      </div>
    );
  }

  const submit = handleSubmit((values) => {
    const actualChanged = Boolean(formState.dirtyFields.actualHours || formState.dirtyFields.actualMinutes);
    try {
      localStorage.setItem(LAST_CATEGORY_KEY, values.categoryId);
    } catch {}
    startTransition(async () => {
      const result = await safe(saveTask(task?.id ?? null, { ...getValues(), actualChanged }));
      if (result.ok) {
        toast.success(isEdit ? "Task saved" : "Task added");
        onDone();
      } else {
        toast.error(result.error);
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          setError(field as keyof TaskFormInput, { message });
        }
      }
    });
  });

  const fieldProps = { register, errors, idPrefix: "task" };
  const estimateError = errors.estimateHours?.message ?? errors.estimateMinutes?.message;
  const actualError = errors.actualHours?.message ?? errors.actualMinutes?.message;

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex items-start gap-3 border-b bg-gradient-to-b from-primary/[0.06] to-transparent px-5 pt-5 pb-4 pr-12">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
          {isEdit ? <PencilIcon className="size-4.5" /> : <AddTaskIcon className="size-5.5" />}
        </span>
        <div className="min-w-0">
          <DialogTitle className="text-lg font-semibold">{isEdit ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Change anything, including the time, even after it's done." : "Plan it with an estimate, then press play when you start."}
          </DialogDescription>
        </div>
      </div>

      <div className="grid gap-5 p-5">
        <div className="grid gap-1.5">
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            autoFocus={!isEdit}
            maxLength={120}
            placeholder="What will you work on?"
            className="h-11 text-base"
            aria-invalid={Boolean(errors.title)}
            {...register("title")}
          />
          <FieldError message={errors.title?.message} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CategorySelect {...fieldProps} categories={categories} />
          <SubcategorySelect {...fieldProps} category={category} />
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Status</legend>
          <div className="grid grid-cols-3 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm text-muted-foreground transition-colors",
                  "hover:bg-muted/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  status === opt.value && cn("font-medium", opt.active),
                )}
              >
                <input type="radio" value={opt.value} className="sr-only" {...register("status")} />
                <span className={cn("size-2.5 rounded-full", opt.dot)} aria-hidden="true" />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <DurationInput
              id="task-estimate"
              label="Estimated time"
              icon={<EstimateIcon className="size-4" />}
              hours={register("estimateHours")}
              minutes={register("estimateMinutes")}
              maxHours={24}
              invalid={Boolean(estimateError)}
            />
            <FieldError message={estimateError} />
          </div>
          <div className="grid gap-1.5">
            <DurationInput
              id="task-actual"
              label="Actual time"
              accent="primary"
              icon={<ActualIcon className="size-4" />}
              hours={register("actualHours")}
              minutes={register("actualMinutes")}
              maxHours={99}
              invalid={Boolean(actualError)}
              disabled={isRunning}
              hint={
                isRunning ? (
                  <>
                    Timer running: <span className="font-medium text-foreground tabular-nums">{formatClock(live.seconds)}</span>. Pause it to
                    edit.
                  </>
                ) : isEdit ? (
                  "Tracked by the timer. Edit to correct it."
                ) : (
                  "Optional: time already spent."
                )
              }
            />
            <FieldError message={actualError} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DateInput {...fieldProps} />
        </div>
        <DescriptionInput {...fieldProps} />

        {task && task.sessions.length > 0 && <SessionHistory sessions={task.sessions} />}
      </div>

      <div className="sticky bottom-0 flex items-center gap-2 border-t bg-popover/95 px-5 py-3.5 backdrop-blur">
        {task && onDelete && (
          <Button
            type="button"
            variant="ghost"
            className="h-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              onDelete(task);
              onDone();
            }}
          >
            <Trash2Icon /> Delete
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" className="h-10 px-4" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" className="h-10 px-5" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Add task"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function SessionHistory({ sessions }: { sessions: TimeSession[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-medium outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Session history
        <span className="text-xs font-normal text-muted-foreground">{sessions.length}</span>
        <ChevronDownIcon className={cn("ml-auto size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="divide-y border-t">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: TimeSession }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [start, setStart] = useState(() => toLocalInput(session.started_at));
  const [end, setEnd] = useState(() => (session.ended_at ? toLocalInput(session.ended_at) : ""));
  const [pending, startTransition] = useTransition();
  const runningNow = !session.ended_at;
  const seconds = sessionSeconds(session.started_at, session.ended_at);

  const save = () =>
    startTransition(async () => {
      const result = await safe(updateSession({ sessionId: session.id, startedAt: start, endedAt: end }));
      if (result.ok) {
        toast.success("Session updated");
        setEditing(false);
      } else toast.error(result.error);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await safe(deleteSession(session.id));
      if (result.ok) toast.success("Session deleted");
      else toast.error(result.error);
    });

  if (editing) {
    return (
      <li className="grid gap-2 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-xs">
            Start
            <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="h-9" />
          </label>
          <label className="grid gap-1 text-xs">
            End
            <Input type="datetime-local" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="h-9" />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            Save
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <div className="min-w-0 flex-1">
        <p className="tabular-nums">
          {formatDayLabel(dayOf(session.started_at))}, {formatTime(session.started_at)} – {runningNow ? "now" : formatTime(session.ended_at!)}
        </p>
        <p className="text-xs text-muted-foreground">
          {runningNow ? "Running" : formatMinutesLong(seconds / 60)}
          {session.source === "manual" && " · added manually"}
        </p>
      </div>
      {!runningNow &&
        (confirming ? (
          <div className="flex items-center gap-1">
            <Button type="button" size="sm" variant="destructive" onClick={remove} disabled={pending}>
              <CheckIcon /> Delete
            </Button>
            <Button type="button" size="icon-sm" variant="ghost" onClick={() => setConfirming(false)} aria-label="Keep session">
              <XIcon />
            </Button>
          </div>
        ) : (
          <div className="flex items-center">
            <Button type="button" size="icon-sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit session">
              <PencilIcon />
            </Button>
            <Button type="button" size="icon-sm" variant="ghost" onClick={() => setConfirming(true)} aria-label="Delete session">
              <Trash2Icon />
            </Button>
          </div>
        ))}
    </li>
  );
}
