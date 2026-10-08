import { existsSync, statSync, truncateSync } from "node:fs";
import type { AlertResult } from "./core/alerts.ts";
import { logPath } from "./db/paths.ts";
import { Store } from "./db/store.ts";
import { notifyAlert } from "./notify.ts";
import { createSyncer, type SyncResult } from "./service.ts";

const TICK_MS = 10_000;
const MAX_LOG_BYTES = 5 * 1024 * 1024;

/** True when a process with this pid exists (signal 0 only checks). */
function pidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** One daemon iteration: sync usage, record + notify any alert, write the heartbeat. */
export function tick(
  store: Store,
  sync: () => SyncResult,
  notify: (alert: AlertResult, totalCents: number) => void = notifyAlert,
): SyncResult {
  const r = sync();
  if (r.alert) {
    store.saveLastAlert(r.alert, r.totalCents);
    notify(r.alert, r.totalCents);
  }
  store.writeHeartbeat({ totalCents: r.totalCents, unknownModels: r.unknownModels, pricesError: r.pricesError });
  return r;
}

const log = (msg: string) => console.log(`${new Date().toISOString()} ${msg}`);

/**
 * Run until signalled. Refuses to start when the process that wrote the last heartbeat is still
 * running. Checking the pid (not heartbeat age) means a restart right after a kill still starts.
 */
export async function runDaemon(store: Store) {
  const hb = store.getHeartbeat();
  if (hb && hb.pid !== process.pid && pidRunning(hb.pid)) {
    log(`another daemon (pid ${hb.pid}) is already running; exiting`);
    return;
  }
  try {
    const f = logPath();
    if (existsSync(f) && statSync(f).size > MAX_LOG_BYTES) truncateSync(f, 0);
  } catch {
    // ignore
  }

  const sync = createSyncer(store);
  log(`daemon started (pid ${process.pid})`);
  const run = () => {
    try {
      const r = tick(store, sync);
      if (r.alert) log(`alert: ${r.alert.crossed} milestone(s), today ${r.totalCents}c`);
    } catch (e) {
      log(`tick failed: ${(e as Error).stack ?? e}`);
    }
  };
  run();
  const id = setInterval(run, TICK_MS);

  await new Promise<void>((resolve) => {
    const stop = () => {
      clearInterval(id);
      resolve();
    };
    process.once("SIGTERM", stop);
    process.once("SIGINT", stop);
  });
  log("daemon stopping");
}
