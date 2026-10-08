import type { Database } from "bun:sqlite";

export type HeartbeatInput = { totalCents: number; unknownModels: string[]; pricesError: string | null };
export type Heartbeat = HeartbeatInput & { pid: number; at: Date };

/** A heartbeat younger than this means a daemon is alive. */
export const ALIVE_MS = 30_000;

export function isAlive(hb: Heartbeat | null, now = new Date()): boolean {
  return !!hb && now.getTime() - hb.at.getTime() < ALIVE_MS;
}

/** Single row written by the daemon every tick so the TUI can tell it is alive and syncing. */
export class HeartbeatRepo {
  constructor(
    private db: Database,
    private clock: () => Date,
  ) {}

  write(h: HeartbeatInput) {
    this.db
      .query(
        `INSERT INTO daemon_heartbeat (id, pid, at, total_cents, unknown_models, prices_error)
         VALUES (1, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET pid = excluded.pid, at = excluded.at, total_cents = excluded.total_cents,
           unknown_models = excluded.unknown_models, prices_error = excluded.prices_error`,
      )
      .run(process.pid, this.clock().toISOString(), h.totalCents, JSON.stringify(h.unknownModels), h.pricesError);
  }

  get(): Heartbeat | null {
    const r = this.db
      .query("SELECT pid, at, total_cents AS totalCents, unknown_models AS um, prices_error AS pricesError FROM daemon_heartbeat WHERE id = 1")
      .get() as { pid: number; at: string; totalCents: number; um: string; pricesError: string | null } | null;
    if (!r) return null;
    return { pid: r.pid, at: new Date(r.at), totalCents: r.totalCents, unknownModels: JSON.parse(r.um), pricesError: r.pricesError };
  }
}
