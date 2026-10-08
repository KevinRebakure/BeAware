import { Database } from "bun:sqlite";
import { afterEach, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Store } from "../src/db/store.ts";
import { createSyncer } from "../src/service.ts";
import { cleanupTmpDirs, isolatedRoots, tmpDir } from "./helpers.ts";
import { chatLog, makeCliDb, SENTINEL, writeChat } from "./providers/copilot-fixtures.ts";

afterEach(cleanupTmpDirs);

const NOW = new Date(2026, 9, 5, 12, 0);

/** Privacy rule (docs/developer/privacy-rules.md): prompt and response text from any tool never reaches BeAware's database. */
test("no prompt or response text from any ingester reaches the database", () => {
  const root = tmpDir("beaware-priv-");
  const dbFile = join(root, "t.db");
  const store = new Store(dbFile, () => NOW);
  const vscodeRoot = join(root, "workspaceStorage");
  const cliPath = join(root, "copilot", "session-store.db");
  makeCliDb(cliPath, [{ at: new Date(2026, 9, 5, 9).toISOString(), input: 100, output: 10, nanoAiu: 1e10 }]);
  writeChat(vscodeRoot, "ws", "s", chatLog("s", [{ id: "r1", at: new Date(2026, 9, 5, 9).getTime(), prompt: 100, output: 10 }]));
  const claudeRoot = join(root, "projects");
  mkdirSync(join(claudeRoot, "p1"), { recursive: true });
  const claudeLine = {
    type: "assistant",
    requestId: "req1",
    timestamp: new Date(2026, 9, 5, 9).toISOString(),
    cwd: `/work/${SENTINEL}`,
    message: {
      id: "m1",
      model: "claude-opus-5-5",
      content: [{ type: "text", text: SENTINEL }],
      usage: { input_tokens: 100, output_tokens: 10 },
    },
  };
  writeFileSync(join(claudeRoot, "p1", "a.jsonl"), JSON.stringify(claudeLine) + "\n");
  const roots = isolatedRoots(root, { "claude-code": claudeRoot, "copilot-cli": cliPath, "copilot-vscode": vscodeRoot });

  const r = createSyncer(store, { roots, pricesFile: join(root, "prices.json"), now: NOW })();
  expect(r.totalCents).toBeGreaterThan(0); // the fixtures really were ingested
  store.close();

  const raw = new Database(dbFile, { readonly: true });
  const tables = raw.query("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[];
  for (const { name } of tables) {
    expect(JSON.stringify(raw.query(`SELECT * FROM "${name}"`).all())).not.toContain(SENTINEL);
  }
  const { n: rows } = raw.query("SELECT COUNT(*) AS n FROM spend_events").get() as { n: number };
  expect(rows).toBe(3); // one Claude, one CLI and one VS Code row were really ingested
  raw.close();
});
