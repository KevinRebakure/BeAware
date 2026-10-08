import type { Database } from "bun:sqlite";

/** Byte offset already read from each log file, for incremental ingestion. */
export class IngestFilesRepo {
  constructor(private db: Database) {}

  getOffset(path: string): number | null {
    const row = this.db.query("SELECT offset FROM ingest_files WHERE path = ?").get(path) as {
      offset: number;
    } | null;
    return row?.offset ?? null;
  }

  setOffset(path: string, offset: number) {
    this.db
      .query("INSERT INTO ingest_files (path, offset) VALUES (?, ?) ON CONFLICT(path) DO UPDATE SET offset = excluded.offset")
      .run(path, offset);
  }
}
