import type { Database } from "bun:sqlite";
import type { Usage } from "../../core/pricing.ts";

/** Amounts are stored as integer micro-dollars (1 cent = 10_000) because token costs are fractions of a cent. */
export const MICROS_PER_CENT = 10_000;

/** Both the provider and the source of spend added by hand. */
export const MANUAL = "manual";

type StoredRow = Usage & { id: number; model: string; amountMicros: number };

/** One response/request from an AI tool. `key` is unique within its source; the stored `ext_key` is `<sourceId>:<key>`. */
export type UsageEvent = {
  sourceId: string;
  providerId: string;
  key: string;
  model: string;
  at: string;
  usage: Usage;
};

export type BreakdownRow = { providerId: string; sourceId: string; micros: number };

export class SpendEventsRepo {
  constructor(
    private db: Database,
    private clock: () => Date,
  ) {}

  /** Manual spend, in cents. */
  addManual(cents: number) {
    this.db
      .query("INSERT INTO spend_events (source, provider, amount_micros, created_at) VALUES (?, ?, ?, ?)")
      .run(MANUAL, MANUAL, cents * MICROS_PER_CENT, this.clock().toISOString());
  }

  /** Delete all manually added spend (any day). Log-derived usage is untouched. */
  clearManual() {
    this.db.query("DELETE FROM spend_events WHERE source = ?").run(MANUAL);
  }

  /** Insert or overwrite one usage event (the last write for a key wins). */
  upsertEvent(ev: UsageEvent, amountMicros: number) {
    const u = ev.usage;
    this.db
      .query(
        `INSERT INTO spend_events (source, provider, ext_key, model, input_tokens, output_tokens, cache_read_tokens,
           cache_5m_tokens, cache_1h_tokens, amount_micros, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(ext_key) DO UPDATE SET model = excluded.model, input_tokens = excluded.input_tokens,
           output_tokens = excluded.output_tokens, cache_read_tokens = excluded.cache_read_tokens,
           cache_5m_tokens = excluded.cache_5m_tokens, cache_1h_tokens = excluded.cache_1h_tokens,
           amount_micros = excluded.amount_micros, created_at = excluded.created_at`,
      )
      .run(ev.sourceId, ev.providerId, `${ev.sourceId}:${ev.key}`, ev.model, u.input, u.output, u.cacheRead, u.cache5m, u.cache1h, amountMicros, ev.at);
  }

  /** Sum of spend in [start, end), in whole cents (rounded down). */
  totalCents(start: Date, end: Date): number {
    const row = this.db
      .query(
        `SELECT COALESCE(SUM(amount_micros), 0) AS t FROM spend_events
         WHERE created_at >= ? AND created_at < ?`,
      )
      .get(start.toISOString(), end.toISOString()) as { t: number };
    return Math.floor(row.t / MICROS_PER_CENT);
  }

  /** When the oldest stored event happened, or null if there are none. */
  oldestAt(): Date | null {
    const row = this.db.query("SELECT MIN(created_at) AS at FROM spend_events").get() as { at: string | null };
    return row.at ? new Date(row.at) : null;
  }

  /** Delete every event before `cutoff`, manual ones included. Returns how many were removed. */
  deleteBefore(cutoff: Date): number {
    return this.db.query("DELETE FROM spend_events WHERE created_at < ?").run(cutoff.toISOString()).changes;
  }

  /** Spend in [start, end) split by provider and source, for the dashboard. */
  breakdown(start: Date, end: Date): BreakdownRow[] {
    return this.db
      .query(
        `SELECT provider AS providerId, source AS sourceId, COALESCE(SUM(amount_micros), 0) AS micros
         FROM spend_events WHERE created_at >= ? AND created_at < ?
         GROUP BY provider, source ORDER BY provider, source`,
      )
      .all(start.toISOString(), end.toISOString()) as BreakdownRow[];
  }

  modelsFor(sourceId: string): string[] {
    const rows = this.db
      .query("SELECT DISTINCT model FROM spend_events WHERE source = ? ORDER BY model")
      .all(sourceId) as { model: string }[];
    return rows.map((r) => r.model);
  }

  /** Recompute one source's costs from stored tokens. Returns true if any amount changed. */
  repriceSource(sourceId: string, cost: (model: string, usage: Usage) => number): boolean {
    const rows = this.db
      .query(
        `SELECT id, model, amount_micros AS amountMicros, input_tokens AS input, output_tokens AS output,
           cache_read_tokens AS cacheRead, cache_5m_tokens AS cache5m, cache_1h_tokens AS cache1h
         FROM spend_events WHERE source = ?`,
      )
      .all(sourceId) as StoredRow[];
    const update = this.db.query("UPDATE spend_events SET amount_micros = ? WHERE id = ?");
    let changed = false;
    this.db.transaction(() => {
      for (const r of rows) {
        const next = cost(r.model, r);
        if (next !== r.amountMicros) {
          update.run(next, r.id);
          changed = true;
        }
      }
    })();
    return changed;
  }
}
