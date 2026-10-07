"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "@/lib/utils";

/**
 * Hours and minutes as two boxes side by side: [ HH ] : [ MM ].
 * Typing two digits in HH jumps to MM; empty boxes count as 0.
 */
export function DurationInput({
  id,
  label,
  icon,
  hint,
  hours,
  minutes,
  maxHours,
  invalid,
  disabled,
  accent = "default",
}: {
  id: string;
  label: string;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  hours: UseFormRegisterReturn;
  minutes: UseFormRegisterReturn;
  maxHours: number;
  invalid?: boolean;
  disabled?: boolean;
  accent?: "default" | "primary";
}) {
  const box = cn(
    "h-12 w-full min-w-0 rounded-xl border border-input bg-background text-center font-mono text-xl font-semibold tabular-nums transition-colors outline-none",
    "placeholder:text-muted-foreground/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
    "disabled:cursor-not-allowed disabled:opacity-60 dark:bg-input/30",
    invalid && "border-destructive ring-3 ring-destructive/15",
  );
  const digitsOnly = (e: React.FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const clean = el.value.replace(/\D/g, "");
    if (clean !== el.value) el.value = clean;
  };

  return (
    <fieldset
      className={cn(
        "grid gap-2.5 rounded-2xl border p-3.5",
        accent === "primary" ? "border-primary/25 bg-primary/[0.04]" : "bg-muted/40",
      )}
      disabled={disabled}
      aria-describedby={hint ? `${id}-hint` : undefined}
    >
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center gap-2 text-sm font-medium" aria-hidden="true">
        <span className={cn("flex size-7 items-center justify-center rounded-lg", accent === "primary" ? "bg-primary/12 text-primary" : "bg-background text-muted-foreground")}>
          {icon}
        </span>
        {label}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
        <label className="grid gap-1">
          <input
            id={`${id}-hours`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="00"
            maxLength={maxHours > 99 ? 3 : 2}
            aria-label={`${label}, hours`}
            aria-invalid={invalid || undefined}
            className={box}
            {...hours}
            onInput={(e) => {
              digitsOnly(e);
              if (e.currentTarget.value.length >= 2) document.getElementById(`${id}-minutes`)?.focus();
            }}
          />
          <span className="text-center text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Hours</span>
        </label>
        <span className="-mt-5 text-xl font-semibold text-muted-foreground" aria-hidden="true">
          :
        </span>
        <label className="grid gap-1">
          <input
            id={`${id}-minutes`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="00"
            maxLength={2}
            aria-label={`${label}, minutes`}
            aria-invalid={invalid || undefined}
            className={box}
            {...minutes}
            onInput={digitsOnly}
          />
          <span className="text-center text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Minutes</span>
        </label>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </fieldset>
  );
}
