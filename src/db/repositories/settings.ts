import type { Database } from "bun:sqlite";

export type Settings = { enabled: boolean; intervalCents: number; dayStartHour: number };

export const DEFAULT_SETTINGS: Settings = { enabled: true, intervalCents: 2500, dayStartHour: 4 };

/** The key/value `settings` table: user settings plus internal flags (e.g. `synced_once:<providerId>`). */
export class SettingsRepo {
  constructor(private db: Database) {}

  /** Always read from disk: the TUI and the daemon are separate writers. */
  get(): Settings {
    const rows = this.db.query("SELECT key, value FROM settings").all() as { key: string; value: string }[];
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      enabled: m.alert_enabled === undefined ? DEFAULT_SETTINGS.enabled : m.alert_enabled === "1",
      intervalCents: m.alert_interval_cents ? Number(m.alert_interval_cents) : DEFAULT_SETTINGS.intervalCents,
      dayStartHour: m.day_start_hour === undefined ? DEFAULT_SETTINGS.dayStartHour : Number(m.day_start_hour),
    };
  }

  save(s: Settings) {
    this.setMeta("alert_enabled", s.enabled ? "1" : "0");
    this.setMeta("alert_interval_cents", String(s.intervalCents));
    this.setMeta("day_start_hour", String(s.dayStartHour));
  }

  /** True until this provider's first sync has completed (that sync is quiet). */
  isFirstSync(providerId: string): boolean {
    return this.getMeta(`synced_once:${providerId}`) === null;
  }

  markSynced(providerId: string) {
    this.setMeta(`synced_once:${providerId}`, "1");
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
}
