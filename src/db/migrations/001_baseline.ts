import type { Database } from "bun:sqlite";

/** The original schema. Idempotent, so databases created before migrations existed pass through unchanged. */
export function baseline(db: Database) {
  db.run(`CREATE TABLE IF NOT EXISTS spend_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    ext_key TEXT UNIQUE,
    model TEXT,
    input_tokens INTEGER, output_tokens INTEGER, cache_read_tokens INTEGER,
    cache_5m_tokens INTEGER, cache_1h_tokens INTEGER,
    amount_micros INTEGER NOT NULL,
    created_at TEXT NOT NULL)`);
  db.run(`CREATE INDEX IF NOT EXISTS spend_events_at ON spend_events (created_at)`);
  db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  db.run(`CREATE TABLE IF NOT EXISTS alert_state (
    day TEXT PRIMARY KEY, last_milestone_cents INTEGER NOT NULL)`);
  db.run(`CREATE TABLE IF NOT EXISTS daemon_heartbeat (
    id INTEGER PRIMARY KEY CHECK (id = 1), pid INTEGER NOT NULL, at TEXT NOT NULL,
    total_cents INTEGER NOT NULL, unknown_models TEXT NOT NULL, prices_error TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS last_alert (
    id INTEGER PRIMARY KEY CHECK (id = 1), at TEXT NOT NULL, total_cents INTEGER NOT NULL,
    crossed INTEGER NOT NULL, reached_cents INTEGER NOT NULL, next_cents INTEGER NOT NULL,
    dismissed INTEGER NOT NULL DEFAULT 0)`);
  db.run(`CREATE TABLE IF NOT EXISTS ingest_files (path TEXT PRIMARY KEY, offset INTEGER NOT NULL)`);
}
