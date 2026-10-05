"use client";

import { createContext, use, useEffect, useOptimistic, useState } from "react";
import type { RunningTimer } from "@/lib/data";

type TimerView = {
  running: RunningTimer | null;
  /** Seconds from a just-stopped session, shown until the server data catches up. */
  frozen: Record<string, number>;
};

type StartInput = {
  id: string;
  title: string;
  estimated_minutes: number;
  categoryColor: string | null;
  previousSeconds: number;
};

type TimerContextValue = TimerView & {
  /** Optimistic updates; call inside a transition. */
  optimisticStart: (task: StartInput) => void;
  optimisticStop: () => void;
  /** Current time on the server's clock (ms). */
  now: () => number;
};

const TimerContext = createContext<TimerContextValue | null>(null);
const NowContext = createContext<number>(0);

export function TimerProvider({
  running: serverRunning,
  serverNow,
  children,
}: {
  running: RunningTimer | null;
  serverNow: number;
  children: React.ReactNode;
}) {
  // The browser only animates the seconds; the server's clock is the source of truth,
  // so correct for a phone clock that is off.
  const [offset] = useState(() => serverNow - Date.now());
  const [tick, setTick] = useState(serverNow);
  const now = () => Date.now() + offset;

  const [view, update] = useOptimistic<TimerView, (prev: TimerView) => TimerView>(
    { running: serverRunning, frozen: {} },
    (prev, fn) => fn(prev),
  );

  useEffect(() => {
    if (!view.running) return;
    const update = () => setTick(Date.now() + offset);
    const first = setTimeout(update, 0);
    const id = setInterval(update, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [view.running, offset]);

  const stopCurrent = (prev: TimerView): TimerView["frozen"] => {
    if (!prev.running) return prev.frozen;
    const seconds = Math.max(0, (now() - Date.parse(prev.running.startedAt)) / 1000);
    const id = prev.running.task.id;
    return { ...prev.frozen, [id]: (prev.frozen[id] ?? 0) + seconds };
  };

  const value: TimerContextValue = {
    ...view,
    now,
    optimisticStop: () => update((prev) => ({ running: null, frozen: stopCurrent(prev) })),
    optimisticStart: (task) =>
      update((prev) => {
        if (prev.running?.task.id === task.id) return prev;
        const frozen = stopCurrent(prev);
        return {
          frozen,
          running: {
            sessionId: "optimistic",
            startedAt: new Date(now()).toISOString(),
            previousSeconds: task.previousSeconds + (frozen[task.id] ?? 0),
            task: {
              id: task.id,
              title: task.title,
              estimated_minutes: task.estimated_minutes,
              categoryColor: task.categoryColor,
            },
          },
        };
      }),
  };

  return (
    <TimerContext value={value}>
      <NowContext value={tick}>{children}</NowContext>
    </TimerContext>
  );
}

export function useTimer() {
  const ctx = use(TimerContext);
  if (!ctx) throw new Error("useTimer must be used inside <TimerProvider>");
  return ctx;
}

/** Re-renders every second while a timer runs. */
export function useNow() {
  return use(NowContext);
}
