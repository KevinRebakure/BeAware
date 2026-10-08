import type { Database } from "bun:sqlite";
import type { AlertResult } from "../../core/alerts.ts";

export type StoredAlert = AlertResult & { at: Date; totalCents: number };

/** Single row: the most recent alert, kept until dismissed in the TUI. */
export class LastAlertRepo {
  constructor(
    private db: Database,
    private clock: () => Date,
  ) {}

  save(a: AlertResult, totalCents: number) {
    this.db
      .query(
        `INSERT INTO last_alert (id, at, total_cents, crossed, reached_cents, next_cents, dismissed)
         VALUES (1, ?, ?, ?, ?, ?, 0)
         ON CONFLICT(id) DO UPDATE SET at = excluded.at, total_cents = excluded.total_cents, crossed = excluded.crossed,
           reached_cents = excluded.reached_cents, next_cents = excluded.next_cents, dismissed = 0`,
      )
      .run(this.clock().toISOString(), totalCents, a.crossed, a.reachedCents, a.nextCents);
  }

  /** The latest alert if it has not been dismissed yet. */
  getPending(): StoredAlert | null {
    const r = this.db
      .query(
        `SELECT at, total_cents AS totalCents, crossed, reached_cents AS reachedCents, next_cents AS nextCents
         FROM last_alert WHERE id = 1 AND dismissed = 0`,
      )
      .get() as { at: string; totalCents: number; crossed: number; reachedCents: number; nextCents: number } | null;
    return r ? { ...r, at: new Date(r.at) } : null;
  }

  dismiss() {
    this.db.query("UPDATE last_alert SET dismissed = 1 WHERE id = 1").run();
  }
}
