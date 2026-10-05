import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const TZ = process.env.APP_TIMEZONE || "Asia/Dhaka";

/** "yyyy-MM-dd" for the given instant in the app time zone. */
export function dayOf(date: Date | string | number): string {
  return formatInTimeZone(new Date(date), TZ, "yyyy-MM-dd");
}

export function todayStr(): string {
  return dayOf(new Date());
}

export function isDateStr(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/** Calendar math on "yyyy-MM-dd" strings, independent of any time zone. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

/** The instant a local day starts in the app time zone. */
export function dayStart(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T00:00:00`, TZ);
}

/** Local "yyyy-MM-dd" + "HH:mm" in the app time zone → instant. */
export function zonedDateTime(dateStr: string, time: string): Date {
  return fromZonedTime(`${dateStr}T${time}:00`, TZ);
}

/** Value for an <input type="datetime-local"> in the app time zone. */
export function toLocalInput(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, "yyyy-MM-dd'T'HH:mm");
}

export function fromLocalInput(value: string): Date {
  return fromZonedTime(value.length === 16 ? `${value}:00` : value, TZ);
}

export function formatTime(iso: string | Date): string {
  return formatInTimeZone(new Date(iso), TZ, "HH:mm");
}

export function formatDayLabel(dateStr: string, today = todayStr()): string {
  const diff = diffDays(dateStr, today);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return formatInTimeZone(dayStart(dateStr), TZ, "EEE, d MMM");
}

export function formatDate(dateStr: string, pattern = "d MMM yyyy"): string {
  return formatInTimeZone(dayStart(dateStr), TZ, pattern);
}

/** Monday of the week containing dateStr. */
export function weekStart(dateStr: string): string {
  const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(dateStr, -((dow + 6) % 7));
}

export const PERIODS = [3, 7, 15, 30, 90, 180, 365] as const;
export type Period = (typeof PERIODS)[number];

export function parsePeriod(value: unknown): Period {
  const n = Number(value);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : 7;
}

export function periodLabel(p: Period): string {
  return p === 365 ? "1 year" : `${p} days`;
}

/** Last N days, inclusive of today. `end` is the exclusive end instant. */
export function periodRange(days: number, today = todayStr()) {
  const startDate = addDays(today, -(days - 1));
  return {
    startDate,
    endDate: today,
    start: dayStart(startDate),
    end: dayStart(addDays(today, 1)),
  };
}

/**
 * Splits [start, end) into per-day seconds in the app time zone, so a session that
 * crosses midnight is attributed to both days. Optionally clipped to [clipStart, clipEnd).
 */
export function splitByDay(
  start: Date,
  end: Date,
  clipStart?: Date,
  clipEnd?: Date,
): { day: string; seconds: number }[] {
  let from = start.getTime();
  let to = end.getTime();
  if (clipStart) from = Math.max(from, clipStart.getTime());
  if (clipEnd) to = Math.min(to, clipEnd.getTime());
  const out: { day: string; seconds: number }[] = [];
  while (from < to) {
    const day = dayOf(from);
    const next = Math.min(dayStart(addDays(day, 1)).getTime(), to);
    out.push({ day, seconds: (next - from) / 1000 });
    from = next;
  }
  return out;
}
