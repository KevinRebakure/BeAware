import { afterEach, expect, test } from "bun:test";
import { join } from "node:path";
import { dayKey, startOfDay } from "../src/core/day.ts";
import { keepFrom, keepFromDay, shouldPrune } from "../src/db/retention.ts";
import { Store } from "../src/db/store.ts";
import { createSyncer } from "../src/service.ts";
import { cleanupTmpDirs, isolatedRoots, tmpDir } from "./helpers.ts";

afterEach(cleanupTmpDirs);

const at = (d: number, h = 10) => new Date(2026, 9, d, h, 0); // October 2026, local time
const NOW = at(8, 12); // Oct 8 12:00 -> today is Oct 8 (days start at 04:00)

test("startOfDay counts back whole app days from the start hour", () => {
  expect(startOfDay(NOW, 4, 0)).toEqual(at(8, 4));
  expect(startOfDay(NOW, 4, 2)).toEqual(at(6, 4));
  expect(startOfDay(at(8, 2), 4, 0)).toEqual(at(7, 4)); // 02:00 still belongs to the previous app day
});

test("kept data starts at the beginning of the day 2 days back (today + 2 previous)", () => {
  expect(keepFrom(NOW, 4)).toEqual(at(6, 4));
  expect(keepFromDay(NOW, 4)).toBe("2026-10-06");
  expect(keepFrom(at(8, 2), 4)).toEqual(at(5, 4));
});

test("pruning triggers when the data covers 7 app days, not before", () => {
  expect(shouldPrune(null, NOW, 4)).toBe(false);
  expect(shouldPrune(at(3, 10), NOW, 4)).toBe(false); // Oct 3..8 is 6 days
  expect(shouldPrune(at(2, 10), NOW, 4)).toBe(true); // Oct 2..8 is 7 days
  expect(shouldPrune(at(3, 3), NOW, 4)).toBe(true); // 03:00 on Oct 3 belongs to app day Oct 2
});

/** A store whose clock we can move, with one event per given day of October. */
function storeWith(days: number[]) {
  let now = NOW;
  const store = new Store(":memory:", () => now);
  for (const d of days) {
    store.upsertEvent(
      { sourceId: "claude-code", providerId: "claude-code", key: `m${d}`, model: "m", at: at(d).toISOString(), usage: { input: 0, output: 0, cacheRead: 0, cache5m: 0, cache1h: 0 } },
      d * 1_000_000, // $d, so each day's spend identifies it
    );
  }
  const dollars = (d: number) => store.breakdown(dayKey(at(d), 4)).reduce((s, r) => s + r.micros, 0) / 1e6;
  return { store, dollars, setNow: (n: Date) => (now = n) };
}

test("below 7 days nothing is deleted", () => {
  const { store, dollars } = storeWith([3, 4, 5, 6, 7, 8]);
  expect(store.prune()).toBe(0);
  expect([3, 4, 5, 6, 7, 8].map(dollars)).toEqual([3, 4, 5, 6, 7, 8]);
});

test("at 7 days the first 4 are deleted and the latest 3 are kept", () => {
  const { store, dollars } = storeWith([2, 3, 4, 5, 6, 7, 8]);
  expect(store.prune()).toBe(4);
  expect([2, 3, 4, 5].map(dollars)).toEqual([0, 0, 0, 0]);
  expect([6, 7, 8].map(dollars)).toEqual([6, 7, 8]);
  expect(store.total()).toBe(800); // today's total is untouched
  expect(store.prune()).toBe(0); // and it settles: nothing more to do until 7 days accumulate again
});

test("it is calendar-based: skipped days still count, and a single old row goes", () => {
  const { store, dollars } = storeWith([1, 8]);
  expect(store.prune()).toBe(1);
  expect([1, 8].map(dollars)).toEqual([0, 8]);
});

test("manual spend and per-day alert state follow the same rule", () => {
  const { store, setNow } = storeWith([8]);
  setNow(at(2, 12));
  store.addSpend(500); // entered on Oct 2
  store.setLastAlerted(500); // alert state for Oct 2
  setNow(at(6, 12));
  store.setLastAlerted(900); // Oct 6
  setNow(NOW);
  store.setLastAlerted(700); // Oct 8
  expect(store.prune()).toBe(1);
  expect(store.lastAlerted("2026-10-02")).toBe(0);
  expect(store.lastAlerted("2026-10-06")).toBe(900);
  expect(store.lastAlerted("2026-10-08")).toBe(700);
  expect(store.breakdown("2026-10-02")).toEqual([]);
});

test("the syncer prunes and reports how many, so the daemon can log it", () => {
  const root = tmpDir("beaware-prune-");
  const store = new Store(join(root, "t.db"), () => NOW);
  for (const d of [2, 3, 4, 5, 6, 8])
    store.upsertEvent(
      { sourceId: "claude-code", providerId: "claude-code", key: `m${d}`, model: "m", at: at(d).toISOString(), usage: { input: 0, output: 0, cacheRead: 0, cache5m: 0, cache1h: 0 } },
      1_000_000,
    );
  const sync = createSyncer(store, { roots: isolatedRoots(root), pricesFile: join(root, "prices.json"), now: NOW });
  expect(sync().pruned).toBe(4); // Oct 2..5
  expect(sync().pruned).toBe(0);
});
