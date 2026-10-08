import type { SyncContext } from "./types.ts";

const DEFAULT_WINDOW_DAYS = 7;

/** Epoch ms before which usage is ignored on first sight (older history can't affect today's total). */
export function windowStart(ctx: SyncContext): number {
  return (ctx.now ?? new Date()).getTime() - (ctx.windowDays ?? DEFAULT_WINDOW_DAYS) * 86_400_000;
}
