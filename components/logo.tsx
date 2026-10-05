import { cn } from "@/lib/utils";

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="9" className="fill-primary" />
        <path
          d="M8 19.5c3-5 5.5-5 8 0s5 5 8 0"
          fill="none"
          strokeWidth="2.6"
          strokeLinecap="round"
          className="stroke-primary-foreground"
        />
        <circle cx="16" cy="11" r="2.2" className="fill-primary-foreground" />
      </svg>
      {withText && <span>FlowState</span>}
    </span>
  );
}
