import { keepFrom } from "../db/retention.ts";
import type { SyncContext } from "./types.ts";

/**
 * Epoch ms before which usage is ignored. It is the same boundary retention prunes at, so ingestion can never
 * bring back a row that was deleted (e.g. when a log is truncated or a chat session is replayed).
 */
export function windowStart(ctx: SyncContext): number {
  return keepFrom(ctx.now ?? new Date(), ctx.store.getSettings().dayStartHour).getTime();
}
