import type { Database } from "bun:sqlite";
import { baseline } from "./001_baseline.ts";
import { providers } from "./002_providers.ts";

/** Ordered; a migration's position + 1 is the `PRAGMA user_version` it brings the database to. Append only. */
const MIGRATIONS: ((db: Database) => void)[] = [baseline, providers];

/**
 * Bring the database up to date. The TUI and the daemon open the same file, so each run takes the
 * write lock first and re-reads the version inside it: whoever loses the race finds nothing to do.
 */
export function migrate(db: Database) {
  db.run("BEGIN IMMEDIATE");
  try {
    const { user_version: current } = db.query("PRAGMA user_version").get() as { user_version: number };
    for (let v = current; v < MIGRATIONS.length; v++) MIGRATIONS[v]!(db);
    if (current < MIGRATIONS.length) db.run(`PRAGMA user_version = ${MIGRATIONS.length}`);
    db.run("COMMIT");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }
}
