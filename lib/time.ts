/** 90 → "1h 30m", 300 → "5h 00m", 4 → "4m" */
export function formatMinutes(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m % 60).padStart(2, "0")}m`;
}

/** 3725 → "1:02:05", 125 → "2:05" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** 90 → "1h 30m", 45 → "45m", 120 → "2h" */
export function formatMinutesLong(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

/** 90 → "1.5" */
export function formatHours(totalMinutes: number, digits = 1): string {
  const h = totalMinutes / 60;
  return Number.isInteger(h) ? String(h) : h.toFixed(digits);
}

/**
 * Parses a duration typed by the user. Accepts "1:30", "01:30", "1h30", "1h 30m",
 * "1.5h", "90m" and a plain number of minutes ("45"). Returns minutes, or null.
 */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;

  let match = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (match) {
    const m = Number(match[2]);
    return m < 60 ? Number(match[1]) * 60 + m : null;
  }
  match = s.match(/^(\d+(?:\.\d+)?)h(?:(\d{1,2})m?)?$/);
  if (match) return Math.round(Number(match[1]) * 60) + Number(match[2] ?? 0);
  match = s.match(/^(\d+)m?$/);
  if (match) return Number(match[1]);
  return null;
}

/** Seconds between two timestamps; a missing end means "now". */
export function sessionSeconds(startedAt: string, endedAt: string | null, now = Date.now()): number {
  const end = endedAt ? new Date(endedAt).getTime() : now;
  return Math.max(0, (end - new Date(startedAt).getTime()) / 1000);
}
