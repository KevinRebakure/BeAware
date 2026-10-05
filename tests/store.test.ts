import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/db/store.ts";
import { addSpend, updateSettings } from "../src/service.ts";

const dirs: string[] = [];
const tmpDb = () => {
  const d = mkdtempSync(join(tmpdir(), "beaware-"));
  dirs.push(d);
  return join(d, "t.db");
};
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

test("spend and alert state survive restart; no duplicate alerts", () => {
  const path = tmpDb();
  let s = new Store(path);
  expect(addSpend(s, 2300).alert).toBeNull();
  const r = addSpend(s, 5500);
  expect(r.totalCents).toBe(7800);
  expect(r.alert?.crossed).toBe(3);
  s.close();

  s = new Store(path);
  expect(s.total()).toBe(7800);
  expect(addSpend(s, 100).alert).toBeNull(); // $79, still below $100
  expect(addSpend(s, 2100).alert?.crossed).toBe(1); // $100
  s.close();
});

test("disabled alerts don't fire and don't replay on re-enable", () => {
  const s = new Store(tmpDb());
  s.saveSettings({ enabled: false, intervalCents: 2500, dayStartHour: 4 });
  expect(addSpend(s, 3000).alert).toBeNull();
  s.saveSettings({ enabled: true, intervalCents: 2500, dayStartHour: 4 });
  expect(addSpend(s, 100).alert).toBeNull();
  expect(addSpend(s, 2000).alert?.crossed).toBe(1); // crosses $50
});

test("settings persist with defaults", () => {
  const path = tmpDb();
  let s = new Store(path);
  expect(s.getSettings()).toEqual({ enabled: true, intervalCents: 2500, dayStartHour: 4 });
  s.saveSettings({ enabled: false, intervalCents: 1000, dayStartHour: 4 });
  s.close();
  s = new Store(path);
  expect(s.getSettings()).toEqual({ enabled: false, intervalCents: 1000, dayStartHour: 4 });
});

// Local-time clock helper: month is 1-based.
const at = (m: number, d: number, h: number) => new Date(2026, m - 1, d, h, 30);
const clocked = (path: string, now: { t: Date }) => new Store(path, () => now.t);

test("day rolls over at the start hour, not midnight", () => {
  const now = { t: at(10, 5, 22) };
  const s = clocked(tmpDb(), now);
  expect(addSpend(s, 3000).alert?.crossed).toBe(1);
  now.t = at(10, 6, 1); // after midnight, before 04:00: same day
  expect(s.total()).toBe(3000);
  expect(addSpend(s, 1000).alert).toBeNull(); // $40, no new milestone
  now.t = at(10, 6, 4); // 04:30: new day
  expect(s.total()).toBe(0);
  expect(s.lastAlerted()).toBe(0);
  expect(addSpend(s, 2500).alert?.crossed).toBe(1);
});

test("changing the start hour re-buckets spend and resets the baseline without alerting", () => {
  const now = { t: at(10, 6, 1) }; // 01:30
  const s = clocked(tmpDb(), now);
  addSpend(s, 3000); // belongs to Oct 5 under 04:00
  expect(s.total()).toBe(3000);
  const settings = s.getSettings();
  expect(updateSettings(s, { ...settings, dayStartHour: 0 })).toBe(true); // now Oct 6, 00:00
  expect(s.total()).toBe(3000);
  expect(s.lastAlerted()).toBe(2500); // baseline rebuilt from totals
  expect(addSpend(s, 100).alert).toBeNull(); // no replay of the $25 milestone
});

test("changing the interval resets the baseline silently", () => {
  const s = new Store(tmpDb());
  addSpend(s, 6000); // last alerted $50
  expect(updateSettings(s, { ...s.getSettings(), intervalCents: 1000 })).toBe(true);
  expect(addSpend(s, 100).alert).toBeNull(); // $61, baseline already $60
  expect(addSpend(s, 900).alert?.crossed).toBe(1); // $70
});

test("toggling alerts alone does not touch the baseline", () => {
  const s = new Store(tmpDb());
  expect(updateSettings(s, { ...s.getSettings(), enabled: false })).toBe(false);
});

test("reset hides spend so far and clears the baseline; later spend counts", () => {
  const now = { t: at(10, 5, 12) };
  const s = clocked(tmpDb(), now);
  addSpend(s, 3000);
  s.resetDay();
  expect(s.total()).toBe(0);
  now.t = at(10, 5, 13);
  expect(addSpend(s, 3000).alert?.crossed).toBe(1);
});
