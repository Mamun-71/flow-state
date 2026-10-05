"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { updateTask } from "@/actions/tasks";
import { addManualTime, deleteSession, updateSession } from "@/actions/sessions";
import { useTaskSeconds } from "@/hooks/use-elapsed";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CategorySelect,
  DateInput,
  DescriptionInput,
  EstimateInput,
  FieldError,
  SubcategorySelect,
} from "@/components/task-fields";
import { taskSchema, type TaskFormInput, type TaskFormValues } from "@/lib/validation";
import { formatDayLabel, dayOf, formatTime, toLocalInput, todayStr } from "@/lib/dates";
import { formatClock, formatMinutes, formatMinutesLong, sessionSeconds } from "@/lib/time";
import type { CategoryWithSubs, TaskView } from "@/lib/data";
import type { TimeSession } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { safe } from "@/lib/safe";

type Tab = "details" | "time";

export function TaskDialog({
  task,
  open,
  onOpenChange,
  tab,
  onTabChange,
  categories,
}: {
  task: TaskView | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  categories: CategoryWithSubs[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {task && (
          <>
            <DialogHeader className="border-b p-5 pr-12">
              <DialogTitle className="text-lg leading-snug break-words">{task.title}</DialogTitle>
              <DialogDescription render={<div />}>
                <TaskSummary task={task} />
              </DialogDescription>
            </DialogHeader>
            <Tabs value={tab} onValueChange={(v) => onTabChange(v as Tab)} className="p-5">
              <TabsList className="w-full">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="time">Time ({task.sessions.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="pt-3">
                <DetailsForm key={task.id} task={task} categories={categories} onSaved={() => onOpenChange(false)} />
              </TabsContent>
              <TabsContent value="time" className="pt-3">
                <TimeTab task={task} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TaskSummary({ task }: { task: TaskView }) {
  const { seconds, running } = useTaskSeconds(task.id, task.trackedSeconds);
  const over = seconds > task.estimated_minutes * 60;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ backgroundColor: task.category?.color ?? "var(--status-todo)" }} />
        {task.category?.name}
        {task.subcategory && ` · ${task.subcategory.name}`}
      </span>
      <span aria-hidden="true">·</span>
      <span className={cn("tabular-nums", over && "font-medium text-status-over")}>
        {running ? formatClock(seconds) : formatMinutes(seconds / 60)} tracked of {formatMinutes(task.estimated_minutes)}
      </span>
    </span>
  );
}

function DetailsForm({ task, categories, onSaved }: { task: TaskView; categories: CategoryWithSubs[]; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState, control, setValue, getValues, setError } = useForm<
    TaskFormInput,
    unknown,
    TaskFormValues
  >({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task.title,
      categoryId: task.category_id,
      subcategoryId: task.subcategory_id ?? "",
      description: task.description ?? "",
      plannedDate: task.planned_date,
      estimate: formatMinutes(task.estimated_minutes),
    },
  });
  const categoryId = useWatch({ control, name: "categoryId" });
  const category = categories.find((c) => c.id === categoryId);

  // Clear the subcategory when the category changes to one it doesn't belong to.
  useEffect(() => {
    const sub = getValues("subcategoryId");
    if (sub && !category?.subcategories.some((s) => s.id === sub)) setValue("subcategoryId", "");
  }, [category, getValues, setValue]);

  const submit = handleSubmit(() =>
    startTransition(async () => {
      const result = await safe(updateTask(task.id, getValues()));
      if (result.ok) {
        toast.success("Saved");
        onSaved();
      } else {
        toast.error(result.error);
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          setError(field as keyof TaskFormInput, { message });
        }
      }
    }),
  );

  const fieldProps = { register, errors: formState.errors, idPrefix: "edit" };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="edit-title">Title</Label>
        <Input id="edit-title" maxLength={120} className="h-9" aria-invalid={Boolean(formState.errors.title)} {...register("title")} />
        <FieldError message={formState.errors.title?.message} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CategorySelect {...fieldProps} categories={categories} />
        <SubcategorySelect {...fieldProps} category={category} />
        <EstimateInput {...fieldProps} />
        <DateInput {...fieldProps} />
      </div>
      <DescriptionInput {...fieldProps} />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function TimeTab({ task }: { task: TaskView }) {
  return (
    <div className="grid gap-5">
      <AddTimeForm task={task} />
      <div>
        <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Session history</h3>
        {task.sessions.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-5 text-center text-sm text-muted-foreground">
            No time tracked yet. Press play, or add time above.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {task.sessions.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AddTimeForm({ task }: { task: TaskView }) {
  const today = todayStr();
  const [date, setDate] = useState(task.planned_date <= today ? task.planned_date : today);
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await safe(addManualTime({ taskId: task.id, date, startTime, duration }));
      if (result.ok) {
        toast.success("Time added");
        setDuration("");
        setErrors({});
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className="rounded-xl bg-muted/50 p-3">
      <p className="mb-2.5 text-sm font-medium">Add time worked without the timer</p>
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor="manual-date" className="text-xs">
            Date
          </Label>
          <Input id="manual-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="h-9" required />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="manual-start" className="text-xs">
            Start
          </Label>
          <Input id="manual-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 w-24" required />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="manual-duration" className="text-xs">
            Duration
          </Label>
          <Input
            id="manual-duration"
            placeholder="0:45"
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="h-9 w-20 tabular-nums"
            aria-invalid={Boolean(errors.duration)}
            required
          />
        </div>
        <Button type="submit" className="h-9" disabled={pending}>
          Add
        </Button>
      </div>
      <FieldError message={errors.duration ?? errors.date ?? errors.startTime} />
    </form>
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
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={pending}>
            Save
          </Button>
        </div>
      </li>
    );
  }

  const startDay = dayOf(session.started_at);
  return (
    <li className="flex items-center gap-3 px-3 py-2.5 text-sm">
      <div className="min-w-0 flex-1">
        <p className="tabular-nums">
          {formatDayLabel(startDay)}, {formatTime(session.started_at)} – {runningNow ? "now" : formatTime(session.ended_at!)}
        </p>
        <p className="text-xs text-muted-foreground">
          {runningNow ? "Running" : formatMinutesLong(seconds / 60)}
          {session.source === "manual" && " · added manually"}
        </p>
      </div>
      {!runningNow &&
        (confirming ? (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="destructive" onClick={remove} disabled={pending}>
              <CheckIcon /> Delete
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setConfirming(false)} aria-label="Keep session">
              <XIcon />
            </Button>
          </div>
        ) : (
          <div className="flex items-center">
            <Button size="icon-sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit session">
              <PencilIcon />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setConfirming(true)} aria-label="Delete session">
              <Trash2Icon />
            </Button>
          </div>
        ))}
    </li>
  );
}
