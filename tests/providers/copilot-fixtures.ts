import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Text that must never reach BeAware's database: it lives in the prompt/response parts of the fixtures. */
export const SENTINEL = "SECRET-PROMPT-TEXT-7f3a";

export type CliRow = {
  id?: number;
  session?: string;
  at: string;
  model?: string;
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  nanoAiu?: number;
};

/** A database shaped like Copilot CLI's session-store.db (WAL mode, usage events plus conversation text). */
export function makeCliDb(path: string, rows: CliRow[]) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.run("PRAGMA journal_mode = WAL");
  db.run(`CREATE TABLE IF NOT EXISTS assistant_usage_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, created_at TEXT, model TEXT,
    input_tokens INTEGER, output_tokens INTEGER, cache_read_tokens INTEGER, cache_write_tokens INTEGER,
    total_nano_aiu INTEGER, request_multiplier REAL, token_details_json TEXT)`);
  db.run("CREATE TABLE IF NOT EXISTS turns (session_id TEXT, user_message TEXT, assistant_response TEXT)");
  db.run("INSERT INTO turns VALUES ('s1', ?, ?)", [SENTINEL, SENTINEL]);
  addCliRows(db, rows);
  return db; // left open on purpose: the ingester must read a live WAL database
}

export function addCliRows(db: Database, rows: CliRow[]) {
  const ins = db.query(`INSERT INTO assistant_usage_events
    (id, session_id, created_at, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_nano_aiu, request_multiplier, token_details_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1.0, ?)`);
  for (const r of rows)
    ins.run(r.id ?? null, r.session ?? "s1", r.at, r.model ?? "claude-sonnet-5.5", r.input ?? 0, r.output ?? 0, r.cacheRead ?? 0, r.cacheWrite ?? 0, r.nanoAiu ?? 0, SENTINEL);
}

export type ChatReq = { id: string; model?: string; at: number; prompt?: number; output?: number };

/** A VS Code chat session log: a snapshot, appended requests, and result patches that arrive later. */
export function chatLog(session: string, reqs: ChatReq[], opts: { resultsFor?: number } = {}): string {
  const lines: unknown[] = [
    { kind: 0, v: { version: 3, sessionId: session, requests: [] } },
  ];
  reqs.forEach((r, i) => {
    lines.push({
      kind: 2,
      k: ["requests"],
      v: [{ requestId: r.id, modelId: r.model ?? "copilot/gemini-2.5-pro", timestamp: r.at, message: { text: SENTINEL }, response: [{ value: SENTINEL }] }],
    });
    if (i < (opts.resultsFor ?? reqs.length) && r.prompt !== undefined) {
      lines.push({ kind: 1, k: ["requests", i, "result"], v: { metadata: { promptTokens: r.prompt, outputTokens: r.output ?? 0, toolCallRounds: [{ response: SENTINEL }] } } });
    }
  });
  return lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
}

export function writeChat(root: string, workspace: string, session: string, text: string) {
  const dir = join(root, workspace, "chatSessions");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${session}.jsonl`);
  writeFileSync(path, text);
  return path;
}
