import type { Database } from "bun:sqlite";

/** Per-day high-water milestone already alerted. */
export class AlertStateRepo {
  constructor(private db: Database) {}

  get(day: string): number {
    const row = this.db.query("SELECT last_milestone_cents AS m FROM alert_state WHERE day = ?").get(day) as {
      m: number;
    } | null;
    return row?.m ?? 0;
  }

  set(day: string, cents: number) {
    this.db
      .query(
        "INSERT INTO alert_state (day, last_milestone_cents) VALUES (?, ?) " +
          "ON CONFLICT(day) DO UPDATE SET last_milestone_cents = excluded.last_milestone_cents",
      )
      .run(day, cents);
  }

  /** Forget days before `day` (a "YYYY-MM-DD" key; keys sort chronologically). */
  deleteBefore(day: string) {
    this.db.query("DELETE FROM alert_state WHERE day < ?").run(day);
  }
}
