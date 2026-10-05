import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { dayKey, dayRange } from "../core/day.ts";
import { dbPath } from "./paths.ts";

export type Settings = { enabled: boolean; intervalCents: number; dayStartHour: number };

export const DEFAULT_SETTINGS: Settings = { enabled: true, intervalCents: 2500, dayStartHour: 4 };

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
      amount_cents INTEGER NOT NULL,
      created_at TEXT NOT NULL)`);
    this.db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    this.db.run(`CREATE TABLE IF NOT EXISTS alert_state (
      day TEXT PRIMARY KEY, last_milestone_cents INTEGER NOT NULL)`);
  }

  close() {
    this.db.close();
  }

  /** The day the clock is in right now, per the current start-hour setting. */
  currentDay(): string {
    return dayKey(this.clock(), this.getSettings().dayStartHour);
  }

  addSpend(cents: number) {
    this.db
      .query("INSERT INTO spend_events (amount_cents, created_at) VALUES (?, ?)")
      .run(cents, this.clock().toISOString());
  }

  total(day = this.currentDay()): number {
    const [start, end] = dayRange(day, this.getSettings().dayStartHour);
    const row = this.db
      .query(
        "SELECT COALESCE(SUM(amount_cents), 0) AS t FROM spend_events WHERE created_at >= ? AND created_at < ?",
      )
      .get(start.toISOString(), end.toISOString()) as { t: number };
    return row.t;
  }

  resetDay(day = this.currentDay()) {
    const [start, end] = dayRange(day, this.getSettings().dayStartHour);
    this.db
      .query("DELETE FROM spend_events WHERE created_at >= ? AND created_at < ?")
      .run(start.toISOString(), end.toISOString());
    this.db.query("DELETE FROM alert_state WHERE day = ?").run(day);
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
    const put = this.db.query(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    );
    put.run("alert_enabled", s.enabled ? "1" : "0");
    put.run("alert_interval_cents", String(s.intervalCents));
    put.run("day_start_hour", String(s.dayStartHour));
  }
}
