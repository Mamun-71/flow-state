"use client";

import { startTransition, useEffect, useEffectEvent, useMemo, useOptimistic, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LayoutGroup, motion } from "motion/react";
import { ChevronDownIcon, CalendarArrowDownIcon } from "lucide-react";
import { toast } from "sonner";
import { deleteTask, moveTasksToDate, reopenTask, reorderTasks } from "@/actions/tasks";
import { useTimer } from "@/components/timer-provider";
import { safe } from "@/lib/safe";
import { useTimerActions } from "@/hooks/use-timer-actions";
import { TaskCard, type CardActions } from "@/components/task-card";
import { TaskDialog } from "@/components/task-dialog";
import { AddTaskIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { CategoryWithSubs, TaskView } from "@/lib/data";
import type { TaskStatus } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Column = "todo" | "in_progress" | "done";
type DragColumn = Exclude<Column, "done">;

const COLUMNS: { id: Column; title: string; dot: string }[] = [
  { id: "todo", title: "To Do", dot: "bg-status-todo" },
  { id: "in_progress", title: "In Progress", dot: "bg-status-progress" },
  { id: "done", title: "Done", dot: "bg-status-done" },
];

type Change =
  | { type: "add"; task: TaskView }
  | { type: "patch"; id: string; patch: Partial<TaskView> }
  | { type: "reorder"; status: DragColumn; ids: string[] };

function applyChange(tasks: TaskView[], change: Change): TaskView[] {
  switch (change.type) {
    case "add":
      return [...tasks, change.task];
    case "patch":
      return tasks.map((t) => (t.id === change.id ? { ...t, ...change.patch } : t));
    case "reorder": {
      const order = new Map(change.ids.map((id, i) => [id, i]));
      return tasks.map((t) =>
        order.has(t.id) ? { ...t, status: change.status, sort_order: order.get(t.id)!, completed_at: null } : t,
      );
    }
  }
}

function byOrder(a: TaskView, b: TaskView) {
  return a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);
}

function isTyping(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable=true]"));
}

export function TaskBoard({
  date,
  today,
  tasks: serverTasks,
  carriedOver: serverCarried,
  categories,
}: {
  date: string;
  today: string;
  tasks: TaskView[];
  carriedOver: TaskView[];
  categories: CategoryWithSubs[];
}) {
  const [all, change] = useOptimistic(useMemo(() => [...serverTasks, ...serverCarried], [serverTasks, serverCarried]), applyChange);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ mode: "add" } | { mode: "edit"; id: string } | null>(null);
  const [mobileColumn, setMobileColumn] = useState<Column>("todo");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragColumns, setDragColumns] = useState<Record<DragColumn, string[]> | null>(null);
  const { running, optimisticStop } = useTimer();
  const timer = useTimerActions();

  const visible = all.filter((t) => !hidden.has(t.id));
  const dayTasks = visible.filter((t) => t.planned_date === date);
  const carried = visible.filter((t) => t.planned_date < date && t.status !== "done" && date === today);
  const byId = new Map(visible.map((t) => [t.id, t]));

  const columns: Record<Column, TaskView[]> = {
    todo: dayTasks.filter((t) => t.status === "todo").sort(byOrder),
    in_progress: dayTasks.filter((t) => t.status === "in_progress").sort(byOrder),
    done: dayTasks
      .filter((t) => t.status === "done")
      .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")),
  };
  if (dragColumns) {
    columns.todo = dragColumns.todo.map((id) => byId.get(id)!).filter(Boolean);
    columns.in_progress = dragColumns.in_progress.map((id) => byId.get(id)!).filter(Boolean);
  }

  // ── Actions ───────────────────────────────────────────────
  const previousSeconds = (t: TaskView) => t.trackedSeconds;

  const actions: CardActions = {
    onStart: (task) =>
      timer.play(
        {
          id: task.id,
          title: task.title,
          estimated_minutes: task.estimated_minutes,
          categoryColor: task.category?.color ?? null,
          previousSeconds: previousSeconds(task),
        },
        () => change({ type: "patch", id: task.id, patch: { status: "in_progress", completed_at: null } }),
      ),
    onStop: () => timer.pause(),
    onDone: (task) =>
      timer.complete(task, () =>
        change({ type: "patch", id: task.id, patch: { status: "done", completed_at: new Date().toISOString() } }),
      ),
    onReopen: (task) =>
      startTransition(async () => {
        const status: TaskStatus = task.sessions.length > 0 ? "in_progress" : "todo";
        change({ type: "patch", id: task.id, patch: { status, completed_at: null } });
        const result = await safe(reopenTask(task.id));
        if (!result.ok) toast.error(result.error);
      }),
    onDelete: (task) => scheduleDelete(task),
    onOpen: (task) => setDialog({ mode: "edit", id: task.id }),
    onMove: (task, status) => {
      const ids = [...columns[status].map((t) => t.id), task.id];
      saveOrder(status, ids, task.id);
    },
  };

  function saveOrder(status: DragColumn, ids: string[], movedId?: string) {
    startTransition(async () => {
      if (status === "todo" && movedId && running?.task.id === movedId) {
        // Moving the running task back to To Do pauses it (reorder_tasks does the same in the database).
        optimisticStop();
      }
      change({ type: "reorder", status, ids });
      const result = await safe(reorderTasks(status, ids));
      if (!result.ok) toast.error(result.error);
    });
  }

  function moveToToday(ids: string[]) {
    startTransition(async () => {
      for (const id of ids) change({ type: "patch", id, patch: { planned_date: today } });
      const result = await safe(moveTasksToDate(ids, today));
      if (!result.ok) toast.error(result.error);
    });
  }

  // Delete with Undo: hide now, delete after the toast has had its chance.
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  function scheduleDelete(task: TaskView) {
    setHidden((prev) => new Set(prev).add(task.id));
    const commit = () => {
      pendingDeletes.current.delete(task.id);
      startTransition(async () => {
        if (running?.task.id === task.id) optimisticStop(); // its sessions are deleted with it
        const result = await safe(deleteTask(task.id));
        if (!result.ok) {
          toast.error(result.error);
          setHidden((prev) => {
            const next = new Set(prev);
            next.delete(task.id);
            return next;
          });
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
          setHidden((prev) => {
            const next = new Set(prev);
            next.delete(task.id);
            return next;
          });
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

  // ── Keyboard shortcuts: N new task, Space play/pause, D done ─
  const onShortcut = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
    if (document.querySelector("[role=dialog], [role=menu], [role=alertdialog]")) return;
    const task = selectedId ? byId.get(selectedId) : undefined;
    const actionable = task && task.status !== "done" && !task.id.startsWith("temp-");
    const key = e.key.toLowerCase();
    if (key === "n") {
      e.preventDefault();
      setDialog({ mode: "add" });
    } else if (key === " " && actionable && !(e.target instanceof Element && e.target.closest("button, a"))) {
      e.preventDefault();
      if (running?.task.id === task.id) actions.onStop();
      else actions.onStart(task);
    } else if (key === "d" && actionable) {
      e.preventDefault();
      actions.onDone(task);
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  // ── Drag and drop ─────────────────────────────────────────
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  const containerOf = (id: string, cols: Record<DragColumn, string[]>): DragColumn | null => {
    if (id === "todo" || id === "in_progress") return id;
    if (cols.todo.includes(id)) return "todo";
    if (cols.in_progress.includes(id)) return "in_progress";
    return null;
  };

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
    setDragColumns({ todo: columns.todo.map((t) => t.id), in_progress: columns.in_progress.map((t) => t.id) });
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || !dragColumns) return;
    const from = containerOf(String(active.id), dragColumns);
    const to = containerOf(String(over.id), dragColumns);
    if (!from || !to || from === to) return;
    setDragColumns((cols) => {
      if (!cols) return cols;
      const target = cols[to];
      const overIndex = target.indexOf(String(over.id));
      const index = overIndex >= 0 ? overIndex : target.length;
      return {
        ...cols,
        [from]: cols[from].filter((id) => id !== active.id),
        [to]: [...target.slice(0, index), String(active.id), ...target.slice(index)],
      };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const cols = dragColumns;
    setActiveId(null);
    setDragColumns(null);
    if (!cols || !over) return;
    const id = String(active.id);
    const container = containerOf(id, cols);
    if (!container) return;
    let ids = cols[container];
    const overIndex = ids.indexOf(String(over.id));
    const activeIndex = ids.indexOf(id);
    if (overIndex >= 0 && overIndex !== activeIndex) ids = arrayMove(ids, activeIndex, overIndex);

    const original = byId.get(id);
    const before = dayTasks.filter((t) => t.status === container).sort(byOrder).map((t) => t.id);
    if (original?.status === container && before.join() === ids.join()) return;
    saveOrder(container, ids, id);
  }

  const activeTask = activeId ? byId.get(activeId) : undefined;
  const dialogTask = dialog?.mode === "edit" ? byId.get(dialog.id) : undefined;
  const isEmpty = dayTasks.length === 0;
  const openAdd = () => setDialog({ mode: "add" });

  return (
    <div className="mt-8 grid gap-6">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">Tasks</h2>
          <p className="text-sm text-muted-foreground">
            {dayTasks.length === 0
              ? "Nothing planned yet"
              : `${columns.done.length} of ${dayTasks.length} done`}
          </p>
        </div>
        <Button onClick={openAdd} className="ml-auto h-11 gap-2 rounded-xl px-4 text-sm shadow-md shadow-primary/20">
          <AddTaskIcon className="size-5" />
          Add task
          <kbd className="ml-1 hidden rounded-md bg-primary-foreground/15 px-1.5 py-0.5 font-sans text-[11px] md:inline">N</kbd>
        </Button>
      </div>

      {carried.length > 0 && (
        <CarriedOver
          tasks={carried}
          actions={{ ...actions, onMoveToToday: (task) => moveToToday([task.id]) }}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMoveAll={() => moveToToday(carried.map((t) => t.id))}
        />
      )}

      {isEmpty ? (
        <EmptyState date={date} today={today} onAdd={openAdd} />
      ) : (
        <>
          {/* Mobile: one column at a time */}
          <div role="tablist" aria-label="Status" className="grid grid-cols-3 rounded-xl bg-muted p-1 md:hidden">
            {COLUMNS.map((col) => (
              <button
                key={col.id}
                role="tab"
                aria-selected={mobileColumn === col.id}
                onClick={() => setMobileColumn(col.id)}
                className={cn(
                  "flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm text-muted-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  mobileColumn === col.id && "bg-background font-medium text-foreground shadow-xs",
                )}
              >
                {col.title}
                <span className="text-xs tabular-nums opacity-70">{columns[col.id].length}</span>
              </button>
            ))}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={() => {
              setActiveId(null);
              setDragColumns(null);
            }}
          >
            <LayoutGroup>
              <div className="grid gap-4 md:grid-cols-3 md:gap-5">
                {COLUMNS.map((col) => (
                  <BoardColumn
                    key={col.id}
                    column={col}
                    tasks={columns[col.id]}
                    hiddenOnMobile={mobileColumn !== col.id}
                    dragActive={activeId !== null}
                    actions={actions}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                ))}
              </div>
            </LayoutGroup>
            <DragOverlay>{activeTask ? <TaskCard task={activeTask} overlay {...actions} /> : null}</DragOverlay>
          </DndContext>
        </>
      )}

      <p className="hidden text-center text-xs text-muted-foreground md:block">
        <Kbd>N</Kbd> new task · <Kbd>Space</Kbd> play / pause selected · <Kbd>D</Kbd> mark selected as done · drag cards to reorder
      </p>

      <TaskDialog
        task={dialogTask}
        defaultDate={date}
        categories={categories}
        open={dialog?.mode === "add" || Boolean(dialogTask)}
        onOpenChange={(open) => !open && setDialog(null)}
        onDelete={scheduleDelete}
      />
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[11px]">{children}</kbd>;
}

function BoardColumn({
  column,
  tasks,
  hiddenOnMobile,
  dragActive,
  actions,
  selectedId,
  onSelect,
}: {
  column: (typeof COLUMNS)[number];
  tasks: TaskView[];
  hiddenOnMobile: boolean;
  dragActive: boolean;
  actions: CardActions;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const sortable = column.id !== "done";
  const { setNodeRef, isOver } = useDroppable({ id: column.id, disabled: !sortable });
  const totalEstimate = tasks.reduce((s, t) => s + t.estimated_minutes, 0);

  const list = (
    <div ref={setNodeRef} className={cn("flex min-h-28 flex-col gap-2.5 rounded-2xl transition-colors", isOver && "bg-primary/5 ring-2 ring-primary/20")}>
      {tasks.map((task) => (
        <motion.div
          key={task.id}
          layout={dragActive ? false : "position"}
          layoutId={dragActive ? undefined : task.id}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        >
          {sortable && !task.id.startsWith("temp-") ? (
            <SortableCard task={task} actions={actions} selected={selectedId === task.id} onSelect={onSelect} />
          ) : (
            <TaskCard task={task} {...actions} onMove={undefined} selected={selectedId === task.id} onSelect={onSelect} />
          )}
        </motion.div>
      ))}
      {tasks.length === 0 && (
        <p className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-border/80 px-3 text-center text-xs text-muted-foreground">
          {column.id === "todo" ? "Nothing waiting" : column.id === "in_progress" ? "Press play on a task to start" : "Nothing finished yet"}
        </p>
      )}
    </div>
  );

  return (
    <section
      aria-label={column.title}
      className={cn("flex-col gap-3 rounded-3xl border border-border/60 bg-muted/35 p-2.5 md:p-3", hiddenOnMobile ? "hidden md:flex" : "flex")}
    >
      <header className="flex items-center gap-2 px-1.5 pt-1">
        <span className={cn("h-4 w-1 rounded-full", column.dot)} aria-hidden="true" />
        <h2 className="text-sm font-semibold">{column.title}</h2>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums shadow-xs">{tasks.length}</span>
        {totalEstimate > 0 && (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {Math.floor(totalEstimate / 60)}:{String(totalEstimate % 60).padStart(2, "0")} est.
          </span>
        )}
      </header>
      {sortable ? (
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {list}
        </SortableContext>
      ) : (
        list
      )}
    </section>
  );
}

function SortableCard({
  task,
  actions,
  selected,
  onSelect,
}: {
  task: TaskView;
  actions: CardActions;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      {...actions}
      selected={selected}
      onSelect={onSelect}
      dragging={isDragging}
      style={{ transform: CSS.Translate.toString(transform), transition, touchAction: "manipulation" }}
      {...listeners}
    />
  );
}

function CarriedOver({
  tasks,
  actions,
  selectedId,
  onSelect,
  onMoveAll,
}: {
  tasks: TaskView[];
  actions: CardActions;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveAll: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-2xl border border-dashed bg-muted/30 p-3 md:p-4">
      <div className="flex items-center gap-2">
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 rounded-md text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", !open && "-rotate-90")} />
          Carried over
          <span className="text-xs font-normal text-muted-foreground tabular-nums">{tasks.length} unfinished from earlier days</span>
        </CollapsibleTrigger>
        <Button size="sm" variant="outline" onClick={onMoveAll}>
          <CalendarArrowDownIcon />
          Move all to today
        </Button>
      </div>
      <CollapsibleContent>
        <div className="mt-3 grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              {...actions}
              onMove={undefined}
              showDate={task.planned_date}
              selected={selectedId === task.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function EmptyState({ date, today, onAdd }: { date: string; today: string; onAdd: () => void }) {
  const label = date === today ? "today" : "this day";
  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-dashed bg-card/50 px-6 py-14 text-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent)]" />
      <svg viewBox="0 0 120 96" className="relative mb-5 h-24 w-32" aria-hidden="true">
        <rect x="18" y="16" width="84" height="70" rx="16" className="fill-card stroke-border" strokeWidth="2" />
        <path d="M18 34h84" className="stroke-border" strokeWidth="2" />
        <path d="M40 8v14M80 8v14" className="stroke-muted-foreground/50" strokeWidth="3" strokeLinecap="round" />
        <rect x="32" y="46" width="34" height="7" rx="3.5" className="fill-muted" />
        <rect x="32" y="62" width="22" height="7" rx="3.5" className="fill-muted" />
        <circle cx="86" cy="64" r="16" className="fill-primary/15" />
        <path d="m79 64 5 5 10-11" fill="none" className="stroke-primary" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M104 14v8M100 18h8M10 52v6M7 55h6" className="stroke-primary/60" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="relative text-base font-semibold">No tasks planned for {label}</p>
      <p className="relative mt-1 max-w-xs text-sm text-muted-foreground">
        Plan your first task with an estimate, then press play when you start working.
      </p>
      <Button className="relative mt-6 h-11 gap-2 rounded-xl px-5 shadow-md shadow-primary/20" onClick={onAdd}>
        <AddTaskIcon className="size-5" />
        Add a task
      </Button>
    </div>
  );
}
