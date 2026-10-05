import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { dayKey, dayRange } from "../core/day.ts";
import type { Usage } from "../core/pricing.ts";
import { dbPath } from "./paths.ts";

export type Settings = { enabled: boolean; intervalCents: number; dayStartHour: number };

export const DEFAULT_SETTINGS: Settings = { enabled: true, intervalCents: 2500, dayStartHour: 4 };

/** Amounts are stored as integer micro-dollars (1 cent = 10_000) because token costs are fractions of a cent. */
const MICROS_PER_CENT = 10_000;

type ClaudeRow = { id: number; model: string; usage: Usage; amountMicros: number };

export class Store {
  private db: Database;

  constructor(
    path: string = dbPath(),
    private clock: () => Date = () => new Date(),
  ) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.run(`CREATE TABLE IF NOT EXISTS spend_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      ext_key TEXT UNIQUE,
      model TEXT,
      input_tokens INTEGER, output_tokens INTEGER, cache_read_tokens INTEGER,
      cache_5m_tokens INTEGER, cache_1h_tokens INTEGER,
      amount_micros INTEGER NOT NULL,
      created_at TEXT NOT NULL)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS spend_events_at ON spend_events (created_at)`);
    this.db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    this.db.run(`CREATE TABLE IF NOT EXISTS alert_state (
      day TEXT PRIMARY KEY, last_milestone_cents INTEGER NOT NULL)`);
    this.db.run(`CREATE TABLE IF NOT EXISTS ingest_files (path TEXT PRIMARY KEY, offset INTEGER NOT NULL)`);
  }

  close() {
    this.db.close();
  }

  tx(fn: () => void) {
    this.db.transaction(fn)();
  }

  /** The day the clock is in right now, per the current start-hour setting. */
  currentDay(): string {
    return dayKey(this.clock(), this.getSettings().dayStartHour);
  }

  /** Manual spend, in cents. */
  addSpend(cents: number) {
    this.db
      .query("INSERT INTO spend_events (source, amount_micros, created_at) VALUES ('manual', ?, ?)")
      .run(cents * MICROS_PER_CENT, this.clock().toISOString());
  }

  /** Insert or overwrite one Claude Code response (the last log line for a message wins). */
  upsertClaude(ev: { key: string; model: string; at: string; usage: Usage }, amountMicros: number) {
    const u = ev.usage;
    this.db
      .query(
        `INSERT INTO spend_events (source, ext_key, model, input_tokens, output_tokens, cache_read_tokens,
           cache_5m_tokens, cache_1h_tokens, amount_micros, created_at)
         VALUES ('claude-code', ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(ext_key) DO UPDATE SET model = excluded.model, input_tokens = excluded.input_tokens,
           output_tokens = excluded.output_tokens, cache_read_tokens = excluded.cache_read_tokens,
           cache_5m_tokens = excluded.cache_5m_tokens, cache_1h_tokens = excluded.cache_1h_tokens,
           amount_micros = excluded.amount_micros, created_at = excluded.created_at`,
      )
      .run(ev.key, ev.model, u.input, u.output, u.cacheRead, u.cache5m, u.cache1h, amountMicros, ev.at);
  }

  /** Today's total in whole cents (rounded down). */
  total(day = this.currentDay()): number {
    const [start, end] = dayRange(day, this.getSettings().dayStartHour);
    const row = this.db
      .query(
        `SELECT COALESCE(SUM(amount_micros), 0) AS t FROM spend_events
         WHERE created_at >= ? AND created_at < ?`,
      )
      .get(start.toISOString(), end.toISOString()) as { t: number };
    return Math.floor(row.t / MICROS_PER_CENT);
  }

  /** Delete all manually added spend (any day). Log-derived usage is untouched. */
  clearManual() {
    this.db.query("DELETE FROM spend_events WHERE source = 'manual'").run();
  }

  claudeModels(): string[] {
    const rows = this.db
      .query("SELECT DISTINCT model FROM spend_events WHERE source = 'claude-code' ORDER BY model")
      .all() as { model: string }[];
    return rows.map((r) => r.model);
  }

  /** Recompute Claude Code costs from stored tokens. Returns true if any amount changed. */
  repriceClaude(cost: (model: string, usage: Usage) => number): boolean {
    const rows = this.db
      .query(
        `SELECT id, model, amount_micros AS amountMicros, input_tokens AS input, output_tokens AS output,
           cache_read_tokens AS cacheRead, cache_5m_tokens AS cache5m, cache_1h_tokens AS cache1h
         FROM spend_events WHERE source = 'claude-code'`,
      )
      .all() as (ClaudeRow["usage"] & { id: number; model: string; amountMicros: number })[];
    const update = this.db.query("UPDATE spend_events SET amount_micros = ? WHERE id = ?");
    let changed = false;
    this.tx(() => {
      for (const r of rows) {
        const next = cost(r.model, r);
        if (next !== r.amountMicros) {
          update.run(next, r.id);
          changed = true;
        }
      }
    });
    return changed;
  }

  getOffset(path: string): number | null {
    const row = this.db.query("SELECT offset FROM ingest_files WHERE path = ?").get(path) as { offset: number } | null;
    return row?.offset ?? null;
  }

  setOffset(path: string, offset: number) {
    this.db
      .query("INSERT INTO ingest_files (path, offset) VALUES (?, ?) ON CONFLICT(path) DO UPDATE SET offset = excluded.offset")
      .run(path, offset);
  }

  /** True until the first log sync has completed (that sync is quiet). */
  isFirstSync(): boolean {
    return this.getMeta("synced_once") === null;
  }

  markSynced() {
    this.setMeta("synced_once", "1");
  }

  lastAlerted(day = this.currentDay()): number {
    const row = this.db
      .query("SELECT last_milestone_cents AS m FROM alert_state WHERE day = ?")
      .get(day) as { m: number } | null;
    return row?.m ?? 0;
  }

  setLastAlerted(cents: number, day = this.currentDay()) {
    this.db
      .query(
        "INSERT INTO alert_state (day, last_milestone_cents) VALUES (?, ?) " +
          "ON CONFLICT(day) DO UPDATE SET last_milestone_cents = excluded.last_milestone_cents",
      )
      .run(day, cents);
  }

  private getMeta(key: string): string | null {
    const row = this.db.query("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | null;
    return row?.value ?? null;
  }

  private setMeta(key: string, value: string) {
    this.db
      .query("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, value);
  }

  getSettings(): Settings {
    const rows = this.db.query("SELECT key, value FROM settings").all() as { key: string; value: string }[];
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      enabled: m.alert_enabled === undefined ? DEFAULT_SETTINGS.enabled : m.alert_enabled === "1",
      intervalCents: m.alert_interval_cents ? Number(m.alert_interval_cents) : DEFAULT_SETTINGS.intervalCents,
      dayStartHour: m.day_start_hour === undefined ? DEFAULT_SETTINGS.dayStartHour : Number(m.day_start_hour),
    };
  }

  saveSettings(s: Settings) {
    this.setMeta("alert_enabled", s.enabled ? "1" : "0");
    this.setMeta("alert_interval_cents", String(s.intervalCents));
    this.setMeta("day_start_hour", String(s.dayStartHour));
  }
}
