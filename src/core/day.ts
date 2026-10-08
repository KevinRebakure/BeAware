/** A "day" runs from `startHour` local time to the same hour the next day. Keys look like "2026-10-05". */

const p = (n: number) => String(n).padStart(2, "0");

export function dayKey(at: Date, startHour: number): string {
  const d = new Date(at);
  if (d.getHours() < startHour) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Half-open [start, end) range of a day key in local time. */
export function dayRange(key: string, startHour: number): [Date, Date] {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return [new Date(y, m - 1, d, startHour), new Date(y, m - 1, d + 1, startHour)];
}

/** Start of the day `daysAgo` days before the day `at` falls in (0 = today's start). */
export function startOfDay(at: Date, startHour: number, daysAgo = 0): Date {
  const [start] = dayRange(dayKey(at, startHour), startHour);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() - daysAgo, startHour);
}

/** Whole hour 0-23, or null. */
export function parseHour(input: string): number | null {
  const m = input.trim().match(/^(\d{1,2})(?::00)?$/);
  if (!m) return null;
  const h = Number(m[1]);
  return h >= 0 && h <= 23 ? h : null;
}

export const formatHour = (h: number) => `${p(h)}:00`;
