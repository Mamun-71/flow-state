"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, ChevronDownIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { saveTask } from "@/actions/tasks";
import { addSession, deleteSession, updateSession } from "@/actions/sessions";
import { useElapsed, useTaskSeconds } from "@/hooks/use-elapsed";
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
  const estimate = splitMinutes(task?.estimated_minutes ?? 0);

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
    try {
      localStorage.setItem(LAST_CATEGORY_KEY, values.categoryId);
    } catch {}
    startTransition(async () => {
      const result = await safe(saveTask(task?.id ?? null, getValues()));
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
          {task && <ActualTime task={task} />}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DateInput {...fieldProps} />
        </div>
        <DescriptionInput {...fieldProps} />

        {task && <SessionHistory taskId={task.id} sessions={task.sessions} />}
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

/** Read only: the sum of the sessions. Edit or add sessions below to change it. */
function ActualTime({ task }: { task: TaskView }) {
  const { seconds, running } = useTaskSeconds(task.id, task.trackedSeconds);
  const timer = useTimer();
  const sessionSecondsNow = useElapsed(running ? timer.running?.startedAt : null);
  const minutes = Math.floor(seconds / 60);
  const box =
    "flex h-12 items-center justify-center rounded-xl border border-primary/15 bg-background/60 font-mono text-xl font-semibold tabular-nums dark:bg-input/20";
  return (
    <div className="grid gap-2.5 rounded-2xl border border-primary/25 bg-primary/[0.04] p-3.5" aria-label={`Actual time, ${formatMinutesLong(minutes)}`}>
      <div className="flex items-center gap-2 text-sm font-medium" aria-hidden="true">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <ActualIcon className="size-4" />
        </span>
        Actual time
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5" aria-hidden="true">
        <div className="grid gap-1">
          <span className={box}>{Math.floor(minutes / 60)}</span>
          <span className="text-center text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Hours</span>
        </div>
        <span className="-mt-5 text-xl font-semibold text-muted-foreground">:</span>
        <div className="grid gap-1">
          <span className={box}>{pad(minutes % 60)}</span>
          <span className="text-center text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Minutes</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {running ? (
          <>
            Timer running · this session{" "}
            <span className="font-medium text-foreground tabular-nums">{formatClock(sessionSecondsNow)}</span>
          </>
        ) : (
          "Sum of the sessions below. Edit a session to change it."
        )}
      </p>
    </div>
  );
}

function SessionHistory({ taskId, sessions }: { taskId: string; sessions: TimeSession[] }) {
  const [open, setOpen] = useState(false);
  /** Default times for a new session, captured when "Add session" is pressed. */
  const [adding, setAdding] = useState<{ start: string; end: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const add = (startedAt: string, endedAt: string) =>
    startTransition(async () => {
      const result = await safe(addSession({ taskId, startedAt, endedAt }));
      if (result.ok) {
        toast.success("Session added");
        setAdding(null);
      } else toast.error(result.error);
    });

  return (
    <div className="rounded-2xl border">
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-medium outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Session history
          <span className="text-xs font-normal text-muted-foreground">{sessions.length}</span>
          <ChevronDownIcon className={cn("ml-auto size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            const now = Date.now();
            setOpen(true);
            setAdding({ start: toLocalInput(new Date(now - 30 * 60_000).toISOString()), end: toLocalInput(new Date(now).toISOString()) });
          }}
          disabled={Boolean(adding)}
        >
          <PlusIcon /> Add session
        </Button>
      </div>
      {open && (adding || sessions.length > 0) && (
        <ul className="divide-y border-t">
          {adding && (
            <li className="p-3">
              <SessionForm
                initialStart={adding.start}
                initialEnd={adding.end}
                pending={pending}
                saveLabel="Add"
                onSave={add}
                onCancel={() => setAdding(null)}
              />
            </li>
          )}
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </ul>
      )}
      {open && !adding && sessions.length === 0 && (
        <p className="border-t px-4 py-3 text-xs text-muted-foreground">No sessions yet. Press play on the task, or add one.</p>
      )}
    </div>
  );
}

/** Start and end inputs for one session (edit or add). */
function SessionForm({
  initialStart,
  initialEnd,
  pending,
  saveLabel,
  onSave,
  onCancel,
  running = false,
}: {
  initialStart: string;
  initialEnd: string;
  pending: boolean;
  saveLabel: string;
  /** The running session: End may stay empty to keep the timer running. */
  running?: boolean;
  onSave: (start: string, end: string) => void;
  onCancel: () => void;
}) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  return (
    <div
      className="grid gap-2"
      onKeyDown={(e) => {
        // These inputs sit inside the task form: Enter saves the session, not the task.
        if (e.key === "Enter") {
          e.preventDefault();
          onSave(start, end);
        }
      }}
    >
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
      {running && (
        <p className="text-xs text-muted-foreground">
          Leave End empty to keep the timer running from the new start, or set it to stop the timer at that time.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={() => onSave(start, end)} disabled={pending}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: TimeSession }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const runningNow = !session.ended_at;
  const live = useElapsed(runningNow ? session.started_at : null);
  const seconds = runningNow ? live : sessionSeconds(session.started_at, session.ended_at);

  const save = (startedAt: string, endedAt: string) =>
    startTransition(async () => {
      const result = await safe(updateSession({ sessionId: session.id, startedAt, endedAt }));
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
      <li className="p-3">
        <SessionForm
          initialStart={toLocalInput(session.started_at)}
          initialEnd={session.ended_at ? toLocalInput(session.ended_at) : ""}
          pending={pending}
          saveLabel="Save"
          onSave={save}
          onCancel={() => setEditing(false)}
          running={runningNow}
        />
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
          {runningNow ? (
            <>
              Running · <span className="tabular-nums">{formatClock(seconds)}</span>
            </>
          ) : (
            formatMinutesLong(seconds / 60)
          )}
          {session.source === "manual" && " · added manually"}
        </p>
      </div>
      {runningNow ? (
        <Button type="button" size="icon-sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit running session">
          <PencilIcon />
        </Button>
      ) : confirming ? (
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
      )}
    </li>
  );
}
