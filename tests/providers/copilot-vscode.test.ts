import { afterEach, expect, test } from "bun:test";
import { readFileSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Store } from "../../src/db/store.ts";
import { copilot } from "../../src/providers/copilot/index.ts";
import { extractRequests, replayPatchLog } from "../../src/providers/copilot/vscode.ts";
import { DEFAULT_PRICES } from "../../src/providers/registry.ts";
import { createSyncer } from "../../src/service.ts";
import { cleanupTmpDirs, isolatedRoots, tmpDir } from "../helpers.ts";
import { chatLog, writeChat } from "./copilot-fixtures.ts";

afterEach(cleanupTmpDirs);

const NOW = new Date(2026, 9, 5, 12, 0);
const ms = (h: number, d = 5) => new Date(2026, 9, d, h, 0).getTime();

function setup() {
  const root = tmpDir("beaware-vs-");
  const vscodeRoot = join(root, "workspaceStorage");
  const store = new Store(join(root, "t.db"), () => NOW);
  const roots = isolatedRoots(root, { "copilot-vscode": vscodeRoot });
  const sync = () => copilot.sync({ store, prices: DEFAULT_PRICES, now: NOW, roots });
  return { root, vscodeRoot, store, roots, sync };
}

test("replaying the patch log yields requests with token counts; in-flight requests are skipped", () => {
  const text = chatLog("sess1", [
    { id: "r1", at: ms(9), prompt: 1000, output: 200 },
    { id: "r2", at: ms(10) }, // no result yet
  ]);
  const reqs = extractRequests(replayPatchLog(text), "fallback");
  expect(reqs).toEqual([
    { key: "sess1:r1", model: "copilot/gemini-2.5-pro", at: new Date(ms(9)).toISOString(), input: 1000, output: 200 },
  ]);
});

test("splices at an index and sets nested values", () => {
  const log = [
    { kind: 0, v: { requests: [{ requestId: "a" }, { requestId: "c" }] } },
    { kind: 2, k: ["requests"], i: 1, v: [{ requestId: "b" }] },
    { kind: 1, k: ["requests", 1, "completionTokens"], v: 7 },
  ].map((l) => JSON.stringify(l)).join("\n");
  const s = replayPatchLog(log + '\n{"kind":1,"k":["requests"');
  expect(s.requests.map((r: any) => r.requestId)).toEqual(["a", "b", "c"]);
  expect(s.requests[1].completionTokens).toBe(7);
});

test("cost is estimated as tokens x copilot/<model> prices, and counted once however often the file changes", () => {
  const { vscodeRoot, store, sync } = setup();
  const path = writeChat(vscodeRoot, "ws1", "sess1", chatLog("sess1", [{ id: "r1", at: ms(9), model: "copilot/gpt-5.5", prompt: 1_000_000, output: 100_000 }]));
  sync();
  expect(store.total()).toBe(800); // 1M x $5 + 0.1M x $30 = $8.00
  sync(); // unchanged: skipped
  writeFileSync(path, chatLog("sess1", [{ id: "r1", at: ms(9), model: "copilot/gpt-5.5", prompt: 1_000_000, output: 100_000 }]) + "\n");
  utimesSync(path, new Date(), new Date(Date.now() + 5000));
  sync(); // changed: replayed, upserted by request id
  expect(store.total()).toBe(800);
  expect(store.breakdown()[0]).toMatchObject({ providerId: "copilot", sourceId: "copilot-vscode" });
});

test("an unpriced model counts as $0 and is reported", () => {
  const { root, vscodeRoot, store, roots } = setup();
  writeChat(vscodeRoot, "ws1", "sess1", chatLog("sess1", [{ id: "r1", at: ms(9), model: "copilot/brand-new-model", prompt: 5000, output: 50 }]));
  const r = createSyncer(store, { roots, pricesFile: join(root, "prices.json"), now: NOW })();
  expect(r.unknownModels).toEqual(["copilot/brand-new-model"]);
  expect(r.totalCents).toBe(0);
});

test("old sessions and requests outside the window are ignored", () => {
  const { vscodeRoot, store, sync } = setup();
  const old = writeChat(vscodeRoot, "ws1", "old", chatLog("old", [{ id: "r1", at: ms(9, 1) - 10 * 86_400_000, prompt: 1_000_000, output: 0 }]));
  const past = new Date(NOW.getTime() - 20 * 86_400_000);
  utimesSync(old, past, past);
  sync();
  expect(store.breakdown("2026-09-21")).toEqual([]);
  expect(store.total()).toBe(0);
});

test("a machine without VS Code is not an error", () => {
  const { store, sync } = setup();
  sync();
  expect(store.total()).toBe(0);
});

test("a prices.json from before Copilot support gains the Copilot defaults without touching existing entries", () => {
  const { root, store, roots } = setup();
  const pricesFile = join(root, "prices.json");
  const edited = { input: 1, output: 2, cacheRead: 3, cache5m: 4, cache1h: 5 };
  writeFileSync(pricesFile, JSON.stringify({ "claude-opus-5-5": edited }));
  const r = createSyncer(store, { roots, pricesFile, now: NOW })();
  expect(r.pricesError).toBeNull();
  const after = JSON.parse(readFileSync(pricesFile, "utf8"));
  expect(after["claude-opus-5-5"]).toEqual(edited); // user's edit kept
  expect(after["claude-sonnet-5-5"]).toBeUndefined(); // Claude defaults the user removed stay removed
  expect(after["copilot/gpt-5.5"]).toBeDefined();
});

test("a replayed chat session never brings back requests that retention has dropped", () => {
  const { vscodeRoot, store, sync } = setup(); // today is Oct 5; kept days start Oct 3
  const path = writeChat(
    vscodeRoot,
    "ws1",
    "sess1",
    chatLog("sess1", [
      { id: "old", at: ms(10, 2), prompt: 1_000_000, output: 0 }, // inside the old 7-day window, but before the kept days
      { id: "kept", at: ms(10, 4), prompt: 1_000_000, output: 0 },
    ]),
  );
  sync();
  expect(store.breakdown("2026-10-02")).toEqual([]);
  expect(store.breakdown("2026-10-04")).toHaveLength(1);

  writeFileSync(path, chatLog("sess1", [{ id: "old", at: ms(10, 2), prompt: 1_000_000, output: 0 }, { id: "kept", at: ms(10, 4), prompt: 1_000_000, output: 0 }, { id: "new", at: ms(11), prompt: 1_000_000, output: 0 }]));
  utimesSync(path, new Date(), new Date(Date.now() + 5000)); // the file changed, so it is replayed in full
  sync();
  expect(store.breakdown("2026-10-02")).toEqual([]);
});
