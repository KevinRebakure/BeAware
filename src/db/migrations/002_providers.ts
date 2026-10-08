import type { Database } from "bun:sqlite";

/**
 * Introduce providers. Every event gets a `provider`, `ext_key` becomes `<sourceId>:<rawKey>`,
 * ingest progress moves to a generic `ingest_cursors(key, value)`, and the global first-sync
 * flag becomes per provider. Existing sources double as provider ids (`claude-code`, `manual`).
 */
export function providers(db: Database) {
  const cols = db.query("PRAGMA table_info(spend_events)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "provider")) db.run("ALTER TABLE spend_events ADD COLUMN provider TEXT");
  db.run("UPDATE spend_events SET provider = source WHERE provider IS NULL");
  db.run(`UPDATE spend_events SET ext_key = 'claude-code:' || ext_key
          WHERE source = 'claude-code' AND ext_key IS NOT NULL AND ext_key NOT LIKE 'claude-code:%'`);
  db.run("CREATE INDEX IF NOT EXISTS spend_events_provider_at ON spend_events (provider, created_at)");

  db.run("CREATE TABLE IF NOT EXISTS ingest_cursors (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  db.run("INSERT OR IGNORE INTO ingest_cursors (key, value) SELECT path, CAST(offset AS TEXT) FROM ingest_files");
  db.run("DROP TABLE IF EXISTS ingest_files");

  db.run(`INSERT OR IGNORE INTO settings (key, value)
          SELECT 'synced_once:claude-code', value FROM settings WHERE key = 'synced_once'`);
  db.run("DELETE FROM settings WHERE key = 'synced_once'");
}
