import { afterEach, expect, test } from "bun:test";
import { tick } from "../src/daemon.ts";
import { isAlive } from "../src/db/repositories/heartbeat.ts";
import { join } from "node:path";
import { cleanupTmpDirs, tmpDir } from "./helpers.ts";
import { Store } from "../src/db/store.ts";
import { plistXml } from "../src/launchd.ts";
import type { SyncResult } from "../src/service.ts";

afterEach(cleanupTmpDirs);

const result = (over: Partial<SyncResult> = {}): SyncResult => ({
  totalCents: 2600,
  alert: null,
  unknownModels: [],
  pruned: 0,
  pricesError: null,
  ...over,
});

test("tick writes a heartbeat and no alert when none crossed", () => {
  const s = new Store(":memory:");
  const sent: number[] = [];
  expect(isAlive(s.getHeartbeat())).toBe(false);
  tick(s, () => result(), (_a, t) => sent.push(t));
  expect(isAlive(s.getHeartbeat())).toBe(true);
  expect(s.getHeartbeat()?.totalCents).toBe(2600);
  expect(s.getPendingAlert()).toBeNull();
  expect(sent).toEqual([]);
});

test("tick records the alert, notifies, and the TUI can dismiss it", () => {
  const s = new Store(":memory:");
  const sent: number[] = [];
  const alert = { crossed: 1, reachedCents: 2500, nextCents: 5000 };
  tick(s, () => result({ alert }), (_a, t) => sent.push(t));
  expect(sent).toEqual([2600]);
  expect(s.getPendingAlert()).toMatchObject({ crossed: 1, totalCents: 2600, nextCents: 5000 });
  s.dismissLastAlert();
  expect(s.getPendingAlert()).toBeNull();
});

test("heartbeat goes stale after 30s", () => {
  const s = new Store(":memory:");
  tick(s, () => result(), () => {});
  expect(isAlive(s.getHeartbeat(), new Date(Date.now() + 31_000))).toBe(false);
});

test("settings written by another Store instance are seen immediately", () => {
  const path = join(tmpDir(), "t.db");
  const daemon = new Store(path);
  const tui = new Store(path);
  expect(daemon.getSettings().intervalCents).toBe(2500);
  tui.saveSettings({ enabled: false, intervalCents: 1000, dayStartHour: 6 });
  expect(daemon.getSettings().intervalCents).toBe(1000);
  daemon.close();
  tui.close();
});

test("plist runs `daemon`, at load, kept alive, with forwarded env", () => {
  const x = plistXml("/b/beaware", "/l/d.log", { BEAWARE_DB: "/x&y.db", HOME: "/h" });
  expect(x).toContain("<string>/b/beaware</string><string>daemon</string>");
  expect(x).toContain("<key>KeepAlive</key><true/>");
  expect(x).toContain("/x&amp;y.db");
  expect(x).not.toContain("<key>HOME</key>");
});
