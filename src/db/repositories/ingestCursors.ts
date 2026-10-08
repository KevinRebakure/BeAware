import type { Database } from "bun:sqlite";

/**
 * How far each ingester has read, for incremental ingestion. Keys and values are opaque to the store:
 * a log file path -> byte offset, a database source -> last row id, and so on.
 */
export class IngestCursorsRepo {
  constructor(private db: Database) {}

  get(key: string): string | null {
    const row = this.db.query("SELECT value FROM ingest_cursors WHERE key = ?").get(key) as { value: string } | null;
    return row?.value ?? null;
  }

  /** Every cursor at once, so an ingester doesn't query once per file. */
  all(): Map<string, string> {
    const rows = this.db.query("SELECT key, value FROM ingest_cursors").all() as { key: string; value: string }[];
    return new Map(rows.map((r) => [r.key, r.value]));
  }

  set(key: string, value: string) {
    this.db
      .query("INSERT INTO ingest_cursors (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, value);
  }
}
