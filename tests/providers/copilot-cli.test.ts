import { afterEach, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Store } from "../../src/db/store.ts";
import { copilot } from "../../src/providers/copilot/index.ts";
import { DEFAULT_PRICES } from "../../src/providers/registry.ts";
import { createSyncer } from "../../src/service.ts";
import { cleanupTmpDirs, isolatedRoots, tmpDir } from "../helpers.ts";
import { addCliRows, makeCliDb } from "./copilot-fixtures.ts";

afterEach(cleanupTmpDirs);

const NOW = new Date(2026, 9, 5, 12, 0);
const at = (h: number, d = 5) => new Date(2026, 9, d, h, 0).toISOString();
const USD = 1e11; // nano-AIU per dollar

function setup() {
  const root = tmpDir("beaware-cli-");
  const dbPath = join(root, "copilot", "session-store.db");
  const store = new Store(join(root, "t.db"), () => NOW);
  const roots = isolatedRoots(root, { "copilot-cli": dbPath });
  const sync = () => copilot.sync({ store, prices: DEFAULT_PRICES, now: NOW, roots });
  return { root, dbPath, store, roots, sync };
}

test("cost comes from Copilot's own nano-AIU figure; tokens are split without overlap", () => {
  const { dbPath, store, sync } = setup();
  makeCliDb(dbPath, [{ at: at(10), input: 1000, output: 50, cacheRead: 600, cacheWrite: 300, nanoAiu: 2.5 * USD }]);
  sync();
  expect(store.total()).toBe(250); // $2.50
  const [row] = store.breakdown();
  expect(row).toEqual({ providerId: "copilot", sourceId: "copilot-cli", micros: 2_500_000 });
});

test("re-syncing is idempotent and only picks up new rows", () => {
  const { dbPath, store, sync } = setup();
  const db = makeCliDb(dbPath, [{ at: at(10), nanoAiu: 1 * USD }]);
  sync();
  sync();
  expect(store.total()).toBe(100);
  addCliRows(db, [{ at: at(11), nanoAiu: 1 * USD }]);
  sync();
  expect(store.total()).toBe(200);
});

test("rows older than the window are skipped but still advance the cursor", () => {
  const { dbPath, store, sync } = setup();
  makeCliDb(dbPath, [
    { at: new Date(2026, 8, 1, 10).toISOString(), nanoAiu: 9 * USD }, // Sep 1: outside the kept days
    { at: at(10), nanoAiu: 1 * USD },
  ]);
  sync();
  expect(store.breakdown("2026-09-01")).toEqual([]);
  expect(store.total()).toBe(100);
  expect(store.getCursor("copilot-cli:last_id")).toBe("2");
});

test("a machine without Copilot CLI is not an error", () => {
  const { store, sync } = setup();
  sync();
  expect(store.total()).toBe(0);
});

test("a recreated database (ids restart) is read again from the start", () => {
  const { dbPath, store, sync } = setup();
  const db = makeCliDb(dbPath, [{ at: at(9), nanoAiu: 1 * USD }, { at: at(10), nanoAiu: 1 * USD }]);
  sync();
  db.close();
  writeFileSync(dbPath, ""); // gone; a fresh CLI starts over
  for (const ext of ["-wal", "-shm"]) writeFileSync(dbPath + ext, "");
  makeCliDb(dbPath, [{ at: at(11), session: "new", nanoAiu: 3 * USD }]);
  sync();
  expect(store.total()).toBe(500);
});

test("CLI cost is reported, so changing prices.json never reprices it; the first sync is quiet", () => {
  const { root, dbPath, store, roots } = setup();
  const pricesFile = join(root, "prices.json");
  const db = makeCliDb(dbPath, [{ at: at(9), nanoAiu: 60 * USD }]); // $60: past several $25 milestones
  const sync = createSyncer(store, { roots, pricesFile, now: NOW });
  const first = sync();
  expect(first.totalCents).toBe(6000);
  expect(first.alert).toBeNull();

  writeFileSync(pricesFile, JSON.stringify({ ...DEFAULT_PRICES, "copilot/claude-sonnet-5.5": { input: 99, output: 99, cacheRead: 99, cache5m: 99, cache1h: 99 } }));
  expect(sync().totalCents).toBe(6000);

  addCliRows(db, [{ at: at(11), nanoAiu: 30 * USD }]);
  const later = sync();
  expect(later.totalCents).toBe(9000);
  expect(later.alert?.crossed).toBeGreaterThan(0);
});
