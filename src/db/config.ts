import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { dbPath } from "./paths.ts";
import { migrate } from "./migrations/index.ts";

/** Open the database, apply connection pragmas, and bring the schema up to date. */
export function openDatabase(path: string = dbPath()): Database {
  const inMemory = path === ":memory:";
  if (!inMemory) mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  // The TUI and the background daemon share this file: WAL lets them read while the other writes.
  db.run("PRAGMA busy_timeout = 5000");
  if (!inMemory) db.run("PRAGMA journal_mode = WAL");
  migrate(db);
  return db;
}
