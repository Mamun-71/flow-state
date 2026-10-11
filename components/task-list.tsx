"use client";

import Link from "next/link";
import { startTransition, useEffect, useOptimistic, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { toast } from "sonner";
import { deleteTask, reopenTask } from "@/actions/tasks";
import { useTimer } from "@/components/timer-provider";
import { useTimerActions } from "@/hooks/use-timer-actions";
import { TaskCard, type CardActions } from "@/components/task-card";
import { TaskDialog } from "@/components/task-dialog";
import { buttonVariants } from "@/components/ui/button";
import type { CategoryWithSubs, TaskPage, TaskView } from "@/lib/data";
import type { TaskStatus } from "@/lib/database.types";
import { diffDays, formatDate, formatDayLabel } from "@/lib/dates";
import { safe } from "@/lib/safe";
import { cn } from "@/lib/utils";

type Patch = { id: string; patch: Partial<TaskView> };

/** All tasks as cards, grouped by planned date (newest first), one page at a time. */
export function TaskList({ result, categories, today }: { result: TaskPage; categories: CategoryWithSubs[]; today: string }) {
  const [tasks, patch] = useOptimistic(result.tasks, (list, { id, patch }: Patch) =>
    list.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  );
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const { running, optimisticStop } = useTimer();
  const timer = useTimerActions();

  const visible = tasks.filter((t) => !hidden.has(t.id));
  const groups: { date: string; tasks: TaskView[] }[] = [];
  for (const task of visible) {
    const last = groups.at(-1);
    if (last?.date === task.planned_date) last.tasks.push(task);
    else groups.push({ date: task.planned_date, tasks: [task] });
  }

  const unhide = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  // Delete with Undo: hide now, delete after the toast has had its chance.
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  function scheduleDelete(task: TaskView) {
    setHidden((prev) => new Set(prev).add(task.id));
    const commit = () => {
      pendingDeletes.current.delete(task.id);
      startTransition(async () => {
        if (running?.task.id === task.id) optimisticStop();
        const res = await safe(deleteTask(task.id));
        if (!res.ok) {
          toast.error(res.error);
          unhide(task.id);
        }
      });
    };
    pendingDeletes.current.set(task.id, setTimeout(commit, 5000));
    toast(`Deleted “${task.title}”`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(pendingDeletes.current.get(task.id));
          pendingDeletes.current.delete(task.id);
          unhide(task.id);
        },
      },
    });
  }
  // Leaving the page finishes any pending deletes right away.
  useEffect(() => {
    const pending = pendingDeletes.current;
    return () => {
      for (const [id, handle] of pending) {
        clearTimeout(handle);
        void safe(deleteTask(id));
      }
      pending.clear();
    };
  }, []);

  const actions: CardActions = {
    onStart: (task) =>
      timer.play(
        {
          id: task.id,
          title: task.title,
          estimated_minutes: task.estimated_minutes,
          categoryColor: task.category?.color ?? null,
          previousSeconds: task.trackedSeconds,
        },
        () => patch({ id: task.id, patch: { status: "in_progress", completed_at: null } }),
      ),
    onStop: () => timer.pause(),
    onDone: (task) =>
      timer.complete(task, () => patch({ id: task.id, patch: { status: "done", completed_at: new Date().toISOString() } })),
    onReopen: (task) =>
      startTransition(async () => {
        const status: TaskStatus = task.sessions.length > 0 ? "in_progress" : "todo";
        patch({ id: task.id, patch: { status, completed_at: null } });
        const res = await safe(reopenTask(task.id));
        if (!res.ok) toast.error(res.error);
      }),
    onDelete: scheduleDelete,
    onOpen: (task) => setEditId(task.id),
  };

  const editTask = editId ? visible.find((t) => t.id === editId) : undefined;

  if (result.total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">No tasks yet. Plan one on the Today page.</p>
        <Link href="/" className={cn(buttonVariants(), "h-10 px-4")}>
          Go to Today
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      {groups.map((group) => (
        <section key={group.date} aria-label={formatDate(group.date, "EEEE, d MMMM yyyy")} className="grid gap-3">
          <header className="flex items-baseline gap-2 px-1">
            <h2 className="text-sm font-semibold">{formatDate(group.date, "EEE, d MMM yyyy")}</h2>
            {Math.abs(diffDays(group.date, today)) <= 1 && (
              <span className="text-xs text-muted-foreground">{formatDayLabel(group.date, today)}</span>
            )}
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
              {group.tasks.length}
            </span>
          </header>
          <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {group.tasks.map((task) => (
              <TaskCard key={task.id} task={task} {...actions} />
            ))}
          </div>
        </section>
      ))}

      {result.pageCount > 1 && <Pagination page={result.page} pageCount={result.pageCount} />}

      <TaskDialog
        task={editTask}
        defaultDate={today}
        categories={categories}
        open={Boolean(editTask)}
        onOpenChange={(open) => !open && setEditId(null)}
        onDelete={scheduleDelete}
      />
    </div>
  );
}

/** Page numbers around the current one, with gaps: 1 … 4 5 6 … 12. */
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  const items: (number | "gap")[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) items.push(p);
    else if (items.at(-1) !== "gap") items.push("gap");
  }
  return items;
}

function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const href = (p: number) => (p === 1 ? "/tasks" : `/tasks?page=${p}`);
  const step = cn(buttonVariants({ variant: "outline" }), "h-10 gap-1 px-3");
  const disabled = "pointer-events-none opacity-50";
  return (
    <nav aria-label="Pages" className="flex items-center justify-center gap-1.5">
      <Link href={href(page - 1)} className={cn(step, page === 1 && disabled)} aria-disabled={page === 1} tabIndex={page === 1 ? -1 : undefined}>
        <ChevronLeftIcon /> <span className="hidden sm:inline">Newer</span>
      </Link>
      {pageItems(page, pageCount).map((item, i) =>
        item === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: item === page ? "default" : "ghost" }),
              "size-10 p-0 tabular-nums",
            )}
          >
            {item}
          </Link>
        ),
      )}
      <Link
        href={href(page + 1)}
        className={cn(step, page === pageCount && disabled)}
        aria-disabled={page === pageCount}
        tabIndex={page === pageCount ? -1 : undefined}
      >
        <span className="hidden sm:inline">Older</span> <ChevronRightIcon />
      </Link>
    </nav>
  );
}
