import { Database } from "bun:sqlite";
import { afterEach, expect, test } from "bun:test";
import { join } from "node:path";
import { baseline } from "../src/db/migrations/001_baseline.ts";
import { Store } from "../src/db/store.ts";
import { cleanupTmpDirs, tmpDir } from "./helpers.ts";

afterEach(cleanupTmpDirs);

const AT = new Date(2026, 9, 5, 10, 0).toISOString();

/** A database as an older BeAware left it: baseline schema, user_version 0, Claude + manual rows. */
function oldDb() {
  const path = join(tmpDir("beaware-mig-"), "old.db");
  const db = new Database(path);
  baseline(db);
  db.run(`INSERT INTO spend_events (source, ext_key, model, amount_micros, created_at) VALUES ('claude-code', 'msg1:req1', 'claude-opus-5-5', 5000, '${AT}')`);
  db.run(`INSERT INTO spend_events (source, amount_micros, created_at) VALUES ('manual', 10000, '${AT}')`);
  db.run("INSERT INTO ingest_files (path, offset) VALUES ('/logs/a.jsonl', 1234)");
  db.run("INSERT INTO settings (key, value) VALUES ('synced_once', '1')");
  db.close();
  return path;
}

test("migrates an old database: providers, prefixed keys, cursors, per-provider sync flag", () => {
  const path = oldDb();
  const store = new Store(path);
  const raw = new Database(path, { readonly: true });

  const rows = raw.query("SELECT source, provider, ext_key FROM spend_events ORDER BY id").all();
  expect(rows).toEqual([
    { source: "claude-code", provider: "claude-code", ext_key: "claude-code:msg1:req1" },
    { source: "manual", provider: "manual", ext_key: null },
  ]);
  expect(store.getCursor("/logs/a.jsonl")).toBe("1234");
  expect(raw.query("SELECT name FROM sqlite_master WHERE name = 'ingest_files'").get()).toBeNull();
  expect(store.isFirstSync("claude-code")).toBe(false); // existing users keep their quiet-first-sync history
  expect(store.isFirstSync("copilot")).toBe(true);
  raw.close();
  store.close();
});

test("migrating twice (or from two connections) is a no-op", () => {
  const path = oldDb();
  const a = new Store(path);
  const b = new Store(path); // the TUI and the daemon both open the file
  a.close();
  b.close();
  const c = new Store(path);
  const raw = new Database(path, { readonly: true });
  expect(raw.query("SELECT ext_key FROM spend_events WHERE source = 'claude-code'").all()).toEqual([
    { ext_key: "claude-code:msg1:req1" }, // not prefixed twice
  ]);
  expect((raw.query("PRAGMA user_version").get() as { user_version: number }).user_version).toBe(2);
  raw.close();
  c.close();
});

test("a fresh database ends at the same version", () => {
  const path = join(tmpDir("beaware-mig-"), "fresh.db");
  new Store(path).close();
  const raw = new Database(path, { readonly: true });
  expect((raw.query("PRAGMA user_version").get() as { user_version: number }).user_version).toBe(2);
  raw.close();
});
