import type { SVGProps } from "react";

/**
 * FlowState's own duotone icons: a soft tinted fill under a crisp outline.
 * They inherit `currentColor`, so they follow text color and the active state.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

const tint = { fill: "currentColor", fillOpacity: 0.16, stroke: "none" } as const;

/** Today: a sun rising over a checked line, "what I do today". */
export function TodayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 15a7 7 0 0 1 14 0Z" {...tint} />
      <path d="M5 15a7 7 0 0 1 14 0" />
      <path d="M12 4.5V3M5.6 7.1 4.5 6M18.4 7.1 19.5 6M2.5 15h19" />
      <path d="m8.5 19 2.2 2 4.8-4" />
    </Icon>
  );
}

/** Calendar: a month page with one highlighted day. */
export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" {...tint} />
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <rect x="13.5" y="13" width="3.5" height="3.5" rx="1" fill="currentColor" stroke="none" />
      <path d="M7.5 14h.01M10.5 14h.01M7.5 17h.01M10.5 17h.01" strokeWidth={2.2} />
    </Icon>
  );
}

/** Stats: rising bars with a trend spark. */
export function StatsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="13" width="4" height="7.5" rx="1.4" {...tint} />
      <rect x="10" y="9.5" width="4" height="11" rx="1.4" {...tint} />
      <rect x="16" y="6" width="4" height="14.5" rx="1.4" {...tint} />
      <path d="M6 20.5V14.4M12 20.5v-9.6M18 20.5V7.4" />
      <path d="m4 9 5-4 4 3 6-5" />
      <path d="M16 3h3v3" />
    </Icon>
  );
}

/** Categories: two stacked tags. */
export function CategoriesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 5.5v5.1a2 2 0 0 0 .6 1.4l7.4 7.4a2 2 0 0 0 2.8 0l5.1-5.1a2 2 0 0 0 0-2.8L12 4.1a2 2 0 0 0-1.4-.6H5.5a2 2 0 0 0-2 2Z" {...tint} />
      <path d="M3.5 5.5v5.1a2 2 0 0 0 .6 1.4l7.4 7.4a2 2 0 0 0 2.8 0l5.1-5.1a2 2 0 0 0 0-2.8L12 4.1a2 2 0 0 0-1.4-.6H5.5a2 2 0 0 0-2 2Z" />
      <circle cx="7.8" cy="7.8" r="1.4" fill="currentColor" stroke="none" />
      <path d="m17.5 19 3-3" />
    </Icon>
  );
}

/** Settings: three sliders. */
export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h7M15 7h5M4 12h3M11 12h9M4 17h9M17 17h3" />
      <circle cx="13" cy="7" r="2.2" {...tint} />
      <circle cx="13" cy="7" r="2.2" />
      <circle cx="9" cy="12" r="2.2" {...tint} />
      <circle cx="9" cy="12" r="2.2" />
      <circle cx="15" cy="17" r="2.2" {...tint} />
      <circle cx="15" cy="17" r="2.2" />
    </Icon>
  );
}

/** Users: two people, one in front. */
export function UsersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 20a6 6 0 0 1 12 0Z" {...tint} />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <circle cx="9" cy="8.5" r="3.5" {...tint} />
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M15.5 5.3a3.5 3.5 0 0 1 0 6.4M18 14.4a6 6 0 0 1 3 5.6" />
    </Icon>
  );
}

/** Add task: a plus inside a soft rounded tile with a spark. */
export function AddTaskIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="15" height="15" rx="4" {...tint} />
      <rect x="3" y="5" width="15" height="15" rx="4" />
      <path d="M10.5 9v7M7 12.5h7" />
      <path d="M19.5 2.5v3M18 4h3" />
    </Icon>
  );
}

/** Hourglass for estimated time. */
export function EstimateIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 3.5h10M7 20.5h10" />
      <path d="M8 3.5c0 4 4 5 4 8.5 0-3.5 4-4.5 4-8.5Z" {...tint} />
      <path d="M8 20.5c0-4 4-5 4-8.5 0 3.5 4 4.5 4 8.5Z" {...tint} />
      <path d="M8 3.5c0 4 4 5 4 8.5s-4 4.5-4 8.5M16 3.5c0 4-4 5-4 8.5s4 4.5 4 8.5" />
    </Icon>
  );
}

/** Stopwatch for actual (tracked) time. */
export function ActualIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="13.5" r="7.5" {...tint} />
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M10 2.5h4M12 2.5V6M12 13.5l3-3M18.5 6.5l1.5-1.5" />
    </Icon>
  );
}

/** Flame for a productive streak / best day. */
export function FlameIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-3.5-2.5-5.5-3.5-8.5-1 2-2.5 3-3.5 3 .5-2.5-.5-5-2-6.5C9.5 6 5.5 9 5.5 14.5A6.5 6.5 0 0 0 12 21Z" {...tint} />
      <path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-3.5-2.5-5.5-3.5-8.5-1 2-2.5 3-3.5 3 .5-2.5-.5-5-2-6.5C9.5 6 5.5 9 5.5 14.5A6.5 6.5 0 0 0 12 21Z" />
      <path d="M12 21a2.8 2.8 0 0 1-2.8-2.8c0-1.8 1.5-2.6 2.8-4.2 1.3 1.6 2.8 2.4 2.8 4.2A2.8 2.8 0 0 1 12 21Z" />
    </Icon>
  );
}
