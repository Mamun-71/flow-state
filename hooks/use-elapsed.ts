"use client";

import { useNow, useTimer } from "@/components/timer-provider";

/** Seconds since `startedAt`, ticking every second (server clock). */
export function useElapsed(startedAt: string | null | undefined): number {
  const now = useNow();
  if (!startedAt) return 0;
  return Math.max(0, (now - Date.parse(startedAt)) / 1000);
}

/** Total tracked seconds for a task, including a live running session. */
export function useTaskSeconds(taskId: string, trackedSeconds: number): { seconds: number; running: boolean } {
  const { running, frozen } = useTimer();
  const isRunning = running?.task.id === taskId;
  const live = useElapsed(isRunning ? running.startedAt : null);
  return { seconds: trackedSeconds + (frozen[taskId] ?? 0) + live, running: isRunning };
}
