"use client";

import { startTransition } from "react";
import { toast } from "sonner";
import { completeTask, pauseTimer, startTimer } from "@/actions/timer";
import { restoreStatus } from "@/actions/tasks";
import { useTimer } from "@/components/timer-provider";
import { safe } from "@/lib/safe";
import type { TaskStatus } from "@/lib/database.types";

type PlayInput = Parameters<ReturnType<typeof useTimer>["optimisticStart"]>[0];

/**
 * Play / Pause / Done with optimistic updates. `alsoApply` runs inside the same
 * transition, so a caller (the board) can update its own optimistic state too.
 */
export function useTimerActions() {
  const timer = useTimer();

  const play = (task: PlayInput, alsoApply?: () => void) =>
    startTransition(async () => {
      timer.optimisticStart(task);
      alsoApply?.();
      const result = await safe(startTimer(task.id));
      if (!result.ok) toast.error(result.error);
    });

  const pause = (alsoApply?: () => void) =>
    startTransition(async () => {
      timer.optimisticStop();
      alsoApply?.();
      const result = await safe(pauseTimer());
      if (!result.ok) toast.error(result.error);
    });

  const complete = (task: { id: string; title: string; status: TaskStatus }, alsoApply?: () => void) =>
    startTransition(async () => {
      if (timer.running?.task.id === task.id) timer.optimisticStop();
      alsoApply?.();
      const result = await safe(completeTask(task.id));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Done: ${task.title}`, {
        action: {
          label: "Undo",
          onClick: () =>
            startTransition(async () => {
              const undo = await safe(restoreStatus(task.id, task.status));
              if (!undo.ok) toast.error(undo.error);
            }),
        },
      });
    });

  return { play, pause, complete, running: timer.running };
}
