import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import type { Store } from "../../db/store.ts";
import { nanoAiuToMicros } from "./aiu.ts";
import { copilotModel } from "./model.ts";

export const CLI_SOURCE_ID = "copilot-cli";
const CURSOR_KEY = "copilot-cli:last_id";
const PAGE = 5000;

/** Privacy: this is the only thing read from the CLI's database. Never `SELECT *`, never the `turns` table. */
const USAGE_QUERY = `SELECT id, session_id, created_at, model, input_tokens, output_tokens,
  cache_read_tokens, cache_write_tokens, total_nano_aiu
  FROM assistant_usage_events WHERE id > ? ORDER BY id LIMIT ${PAGE}`;

type Row = {
  id: number;
  session_id: string;
  created_at: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  cache_write_tokens: number | null;
  total_nano_aiu: number | null;
};

/**
 * Import new model calls from Copilot CLI's session database. The CLI records its own cost per call
 * (nano-AIU), so it is stored as-is rather than recomputed. Progress is the last row id; rows older than
 * the window are skipped but still advance it. Returns the number of events written.
 */
export function syncCopilotCli(store: Store, opts: { dbPath: string; windowStart: number }): number {
  if (!existsSync(opts.dbPath)) return 0; // Copilot CLI isn't installed
  const db = new Database(opts.dbPath, { readonly: true });
  try {
    const hasTable = db.query("SELECT 1 FROM sqlite_master WHERE name = 'assistant_usage_events'").get();
    if (!hasTable) return 0; // an older CLI without usage events

    let cursor = Number(store.getCursor(CURSOR_KEY) ?? 0);
    const max = (db.query("SELECT COALESCE(MAX(id), 0) AS m FROM assistant_usage_events").get() as { m: number }).m;
    if (max < cursor) cursor = 0; // database was recreated

    let written = 0;
    store.tx(() => {
      for (;;) {
        const rows = db.query(USAGE_QUERY).all(cursor) as Row[];
        for (const r of rows) {
          cursor = r.id;
          const at = new Date(r.created_at);
          if (at.getTime() < opts.windowStart) continue;
          const cacheRead = r.cache_read_tokens ?? 0;
          const cacheWrite = r.cache_write_tokens ?? 0;
          store.upsertEvent(
            {
              sourceId: CLI_SOURCE_ID,
              providerId: "copilot",
              key: `${r.session_id}:${r.id}`,
              model: copilotModel(r.model),
              at: at.toISOString(),
              // input_tokens covers the whole prompt; split out cached parts so the columns don't overlap.
              usage: {
                input: Math.max(0, (r.input_tokens ?? 0) - cacheRead - cacheWrite),
                output: r.output_tokens ?? 0,
                cacheRead,
                cache5m: cacheWrite,
                cache1h: 0,
              },
            },
            nanoAiuToMicros(r.total_nano_aiu ?? 0),
          );
          written++;
        }
        if (rows.length > 0) store.setCursor(CURSOR_KEY, String(cursor));
        if (rows.length < PAGE) break; // a short page is the last one
      }
    });
    return written;
  } finally {
    db.close();
  }
}
