import { dayKey, startOfDay } from "../core/day.ts";

/** Once data spans this many app days, the oldest are deleted... */
export const PRUNE_AT_DAYS = 7;
/** ...down to this many (today plus the days before it). Only today's total is ever shown, so older rows are dead weight. */
export const KEEP_DAYS = 3;

/**
 * Where kept data starts: the beginning of the oldest day we keep. Pruning deletes everything before it, and
 * ingestion ignores anything before it, so a pruned row can never be re-imported from a log that gets re-read.
 */
export function keepFrom(now: Date, dayStartHour: number): Date {
  return startOfDay(now, dayStartHour, KEEP_DAYS - 1);
}

/** The first kept day's key, for tables keyed by day. */
export function keepFromDay(now: Date, dayStartHour: number): string {
  return dayKey(keepFrom(now, dayStartHour), dayStartHour);
}

/**
 * True once the oldest row's day is PRUNE_AT_DAYS - 1 or more days back, i.e. the data covers PRUNE_AT_DAYS days
 * (today counts as one). Calendar-based: days with no usage still count.
 */
export function shouldPrune(oldest: Date | null, now: Date, dayStartHour: number): boolean {
  return oldest !== null && oldest < startOfDay(now, dayStartHour, PRUNE_AT_DAYS - 2);
}
