"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckIcon, PauseIcon } from "lucide-react";
import { toast } from "sonner";
import { stopTimerAt } from "@/actions/timer";
import { useTimer } from "@/components/timer-provider";
import { safe } from "@/lib/safe";
import { useElapsed } from "@/hooks/use-elapsed";
import { useTimerActions } from "@/hooks/use-timer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatClock, formatMinutes } from "@/lib/time";
import { formatTime, fromLocalInput, toLocalInput } from "@/lib/dates";
import { cn } from "@/lib/utils";

const FORGOTTEN_AFTER_SECONDS = 4 * 60 * 60;

export function TimerBar() {
  const { running } = useTimer();

  return (
    <AnimatePresence initial={false}>
      {running && (
        <motion.div
          key="timer-bar"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className={cn(
            "fixed inset-x-0 z-40 px-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))]",
            "md:sticky md:top-16 md:bottom-auto md:px-0",
          )}
        >
          <RunningTimerBar />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RunningTimerBar() {
  const { running } = useTimer();
  const { pause, complete } = useTimerActions();
  const sessionSeconds = useElapsed(running?.startedAt);
  const total = (running?.previousSeconds ?? 0) + sessionSeconds;
  const tabTitle = running ? `${formatClock(total)} · ${running.task.title}` : null;

  // Show the running timer in the browser tab.
  useEffect(() => {
    if (!tabTitle) return;
    const original = document.title;
    document.title = tabTitle;
    return () => {
      document.title = original;
    };
  }, [tabTitle]);

  if (!running) return null;

  const estimateSeconds = running.task.estimated_minutes * 60;
  const over = total > estimateSeconds;
  const progress = Math.min(1, total / estimateSeconds);

  return (
    <div className="mx-auto max-w-6xl md:px-6">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-card/95 shadow-lg backdrop-blur supports-backdrop-filter:bg-card/85",
          "md:mt-3 md:rounded-xl md:shadow-sm",
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3 md:px-5">
          <span className="live-dot size-2.5 shrink-0 rounded-full bg-status-progress" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{running.task.title}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              Since {formatTime(running.startedAt)} · estimate {formatMinutes(running.task.estimated_minutes)}
            </p>
          </div>
          <p
            className={cn(
              "font-mono text-2xl font-semibold tracking-tight tabular-nums md:text-3xl",
              over ? "text-status-over" : "text-foreground",
            )}
            aria-live="off"
            aria-label={`Elapsed ${formatClock(total)}`}
          >
            {formatClock(total)}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              size="icon-lg"
              className="size-11 rounded-full"
              onClick={() => pause()}
              aria-label="Pause timer"
            >
              <PauseIcon className="size-5" />
            </Button>
            <Button
              size="icon-lg"
              variant="outline"
              className="size-11 rounded-full"
              onClick={() => complete({ id: running.task.id, title: running.task.title, status: "in_progress" })}
              aria-label="Mark as done"
            >
              <CheckIcon className="size-5" />
            </Button>
          </div>
        </div>
        {sessionSeconds > FORGOTTEN_AFTER_SECONDS && <ForgottenPrompt sessionId={running.sessionId} startedAt={running.startedAt} />}
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-muted" aria-hidden="true">
          <div
            className={cn("h-full transition-[width] duration-1000 ease-linear", over ? "bg-status-over" : "bg-status-progress")}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ForgottenPrompt({ sessionId, startedAt }: { sessionId: string; startedAt: string }) {
  const key = `flowstate:keep-running:${sessionId}`;
  // "Keep running" is remembered per session on this device.
  const remembered = useSyncExternalStore(noopSubscribe, () => readFlag(key), () => true);
  const [keptNow, setKeptNow] = useState(false);
  const [endValue, setEndValue] = useState("");
  const [open, setOpen] = useState(false);

  if (remembered || keptNow) return null;

  const keepRunning = () => {
    try {
      localStorage.setItem(key, "1");
    } catch {}
    setKeptNow(true);
  };

  const save = async () => {
    const result = await safe(stopTimerAt(fromLocalInput(endValue).toISOString()));
    if (result.ok) {
      setOpen(false);
      toast.success("Timer stopped");
    } else toast.error(result.error);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t bg-status-over/10 px-4 py-2.5 text-sm md:px-5">
      <p className="flex-1">Still working on this? It&apos;s been running for over 4 hours.</p>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={keepRunning}>
          Keep running
        </Button>
        <Popover
          open={open}
          onOpenChange={(next) => {
            if (next) setEndValue(toLocalInput(new Date().toISOString()));
            setOpen(next);
          }}
        >
          <PopoverTrigger render={<Button size="sm" variant="outline" />}>Set the end time</PopoverTrigger>
          <PopoverContent className="w-72">
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <label className="grid gap-1.5 text-sm">
                When did you stop?
                <Input
                  type="datetime-local"
                  value={endValue}
                  min={toLocalInput(startedAt)}
                  max={toLocalInput(new Date().toISOString())}
                  onChange={(e) => setEndValue(e.target.value)}
                  required
                />
              </label>
              <Button type="submit" size="sm">
                Stop timer at this time
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function noopSubscribe() {
  return () => {};
}

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
