"use client";

import { forwardRef } from "react";
import { motion } from "motion/react";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ClockPlusIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { useTaskSeconds } from "@/hooks/use-elapsed";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMinutes } from "@/lib/time";
import { formatDayLabel } from "@/lib/dates";
import type { TaskView } from "@/lib/data";
import { cn } from "@/lib/utils";

export type CardActions = {
  onStart: (task: TaskView) => void;
  onStop: () => void;
  onDone: (task: TaskView) => void;
  onReopen: (task: TaskView) => void;
  onDelete: (task: TaskView) => void;
  onOpen: (task: TaskView, tab?: "details" | "time") => void;
  onMove?: (task: TaskView, status: "todo" | "in_progress") => void;
  onMoveToToday?: (task: TaskView) => void;
};

type Props = CardActions & {
  task: TaskView;
  selected?: boolean;
  onSelect?: (id: string) => void;
  showDate?: string; // shows the planned date (for carried-over tasks)
  dragging?: boolean;
  overlay?: boolean;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect">;

export const TaskCard = forwardRef<HTMLDivElement, Props>(function TaskCard(
  {
    task,
    selected,
    onSelect,
    showDate,
    dragging,
    overlay,
    onStart,
    onStop,
    onDone,
    onReopen,
    onDelete,
    onOpen,
    onMove,
    onMoveToToday,
    className,
    ...rest
  },
  ref,
) {
  const { seconds, running } = useTaskSeconds(task.id, task.trackedSeconds);
  const done = task.status === "done";
  const estimateSeconds = task.estimated_minutes * 60;
  const over = seconds > estimateSeconds;
  const progress = Math.min(1, seconds / estimateSeconds);

  return (
    <div
      ref={ref}
      tabIndex={0}
      data-task-id={task.id}
      aria-label={`${task.title}, ${formatMinutes(seconds / 60)} of ${formatMinutes(task.estimated_minutes)}`}
      onFocus={() => onSelect?.(task.id)}
      onPointerDownCapture={() => onSelect?.(task.id)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button, a, [role=menuitem]")) return;
        onOpen(task);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) {
          e.preventDefault();
          onOpen(task);
        }
      }}
      className={cn(
        "group/card relative cursor-pointer rounded-xl border bg-card p-3 text-card-foreground shadow-xs transition-[box-shadow,opacity,border-color] outline-none select-none",
        "hover:border-foreground/15 focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "border-ring/60",
        running && "border-status-progress/50 shadow-sm ring-1 ring-status-progress/25",
        done && "opacity-65 hover:opacity-90",
        dragging && "opacity-40",
        overlay && "cursor-grabbing shadow-xl ring-1 ring-foreground/10",
        className,
      )}
      {...rest}
    >
      <div className="flex items-start gap-3">
        {done ? (
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-status-done/15 text-status-done"
            aria-label="Done"
          >
            <CheckIcon className="size-5" strokeWidth={2.5} />
          </motion.span>
        ) : (
          <Button
            size="icon-lg"
            variant={running ? "default" : "secondary"}
            className={cn("mt-0.5 size-10 shrink-0 rounded-full", !running && "text-foreground hover:text-primary")}
            onClick={() => (running ? onStop() : onStart(task))}
            aria-label={running ? `Pause ${task.title}` : `Start ${task.title}`}
          >
            {running ? <PauseIcon className="size-4.5" /> : <PlayIcon className="ml-0.5 size-4.5" />}
          </Button>
        )}

        <div className="min-w-0 flex-1">
          <p className={cn("text-sm leading-snug font-medium break-words", done && "line-through decoration-muted-foreground/50")}>
            {task.title}
          </p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: task.category?.color ?? "var(--status-todo)" }}
              aria-hidden="true"
            />
            <span className="truncate">
              {task.category?.name}
              {task.subcategory && ` · ${task.subcategory.name}`}
            </span>
            {showDate && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1">
                <CalendarIcon className="size-3" aria-hidden="true" />
                {formatDayLabel(showDate)}
              </span>
            )}
          </p>
          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500",
                  over ? "bg-status-over" : done ? "bg-status-done" : running ? "bg-status-progress" : "bg-status-todo",
                )}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className={cn("text-xs tabular-nums", over ? "font-medium text-status-over" : "text-muted-foreground")}>
              {formatMinutes(seconds / 60)} / {formatMinutes(task.estimated_minutes)}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mt-1 -mr-1 text-muted-foreground md:opacity-0 md:group-focus-within/card:opacity-100 md:group-hover/card:opacity-100 md:aria-expanded:opacity-100"
                aria-label={`Actions for ${task.title}`}
              />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onOpen(task, "details")}>
              <PencilIcon /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpen(task, "time")}>
              <ClockPlusIcon /> Add time
            </DropdownMenuItem>
            {onMoveToToday && (
              <DropdownMenuItem onClick={() => onMoveToToday(task)}>
                <CalendarIcon /> Move to today
              </DropdownMenuItem>
            )}
            {onMove && task.status === "todo" && (
              <DropdownMenuItem onClick={() => onMove(task, "in_progress")}>
                <ArrowRightIcon /> Move to In Progress
              </DropdownMenuItem>
            )}
            {onMove && task.status === "in_progress" && (
              <DropdownMenuItem onClick={() => onMove(task, "todo")}>
                <ArrowRightIcon className="rotate-180" /> Move to To Do
              </DropdownMenuItem>
            )}
            {done ? (
              <DropdownMenuItem onClick={() => onReopen(task)}>
                <RotateCcwIcon /> Reopen
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onDone(task)}>
                <CheckIcon /> Mark as done
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(task)}>
              <Trash2Icon /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
