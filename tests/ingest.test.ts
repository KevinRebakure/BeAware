import { afterEach, expect, test } from "bun:test";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_PRICES } from "../src/core/pricing.ts";
import { Store } from "../src/db/store.ts";
import { parseLine, syncClaude } from "../src/ingest/claude.ts";
import { addSpend, clearManualSpend, createSyncer } from "../src/service.ts";

const dirs: string[] = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "beaware-ing-"));
  dirs.push(d);
  return d;
};
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

const NOW = new Date(2026, 9, 5, 12, 0); // Oct 5 12:00 local, so "today" runs from 04:00
const iso = (h: number, d = 5) => new Date(2026, 9, d, h, 0).toISOString();

type L = { id: string; req?: string; model?: string; at?: string; input?: number; output?: number; cacheRead?: number; w1h?: number; w5m?: number };
const line = (o: L) =>
  JSON.stringify({
    type: "assistant",
    requestId: o.req ?? "req1",
    timestamp: o.at ?? iso(10),
    message: {
      id: o.id,
      model: o.model ?? "claude-opus-5-5",
      usage: {
        input_tokens: o.input ?? 0,
        output_tokens: o.output ?? 0,
        cache_read_input_tokens: o.cacheRead ?? 0,
        cache_creation_input_tokens: (o.w1h ?? 0) + (o.w5m ?? 0),
        cache_creation: { ephemeral_1h_input_tokens: o.w1h ?? 0, ephemeral_5m_input_tokens: o.w5m ?? 0 },
      },
    },
  });

function setup() {
  const root = tmp();
  const proj = join(root, "projects", "p1");
  mkdirSync(proj, { recursive: true });
  const store = new Store(join(root, "t.db"), () => NOW);
  return { root, proj, claudeRoot: join(root, "projects"), pricesFile: join(root, "prices.json"), store };
}

test("parseLine ignores non-usage, synthetic and malformed lines", () => {
  expect(parseLine("not json")).toBeNull();
  expect(parseLine('{"type":"user","message":{"usage":{}}}')).toBeNull();
  expect(parseLine(line({ id: "m", model: "<synthetic>" }))).toBeNull();
  const ev = parseLine(line({ id: "m", input: 5, w1h: 100 }))!;
  expect(ev.key).toBe("m:req1");
  expect(ev.usage).toEqual({ input: 5, output: 0, cacheRead: 0, cache5m: 0, cache1h: 100 });
});

test("a response logged once per content block counts once, last usage wins", () => {
  const { proj, claudeRoot, store } = setup();
  writeFileSync(
    join(proj, "a.jsonl"),
    [line({ id: "m1", output: 2 }), line({ id: "m1", output: 1_000_000 }), line({ id: "m1", output: 1_000_000 })].join("\n") + "\n",
  );
  syncClaude(store, { root: claudeRoot, prices: DEFAULT_PRICES, now: NOW });
  expect(store.total()).toBe(2000); // 1M output tokens at $20/MTok = $20.00, counted once
});

test("the same response in two files (resumed session) counts once", () => {
  const { proj, claudeRoot, store } = setup();
  const l = line({ id: "m1", output: 1_000_000 }) + "\n";
  writeFileSync(join(proj, "a.jsonl"), l);
  writeFileSync(join(proj, "b.jsonl"), l);
  syncClaude(store, { root: claudeRoot, prices: DEFAULT_PRICES, now: NOW });
  expect(store.total()).toBe(2000);
});

test("a half-written last line is read once it completes", () => {
  const { proj, claudeRoot, store } = setup();
  const f = join(proj, "a.jsonl");
  const full = line({ id: "m1", output: 1_000_000 });
  writeFileSync(f, full.slice(0, 40));
  syncClaude(store, { root: claudeRoot, prices: DEFAULT_PRICES, now: NOW });
  expect(store.total()).toBe(0);
  appendFileSync(f, full.slice(40) + "\n");
  syncClaude(store, { root: claudeRoot, prices: DEFAULT_PRICES, now: NOW });
  expect(store.total()).toBe(2000);
});

test("new lines are appended on later syncs without double counting", () => {
  const { proj, claudeRoot, store } = setup();
  const f = join(proj, "a.jsonl");
  writeFileSync(f, line({ id: "m1", output: 1_000_000 }) + "\n");
  syncClaude(store, { root: claudeRoot, prices: DEFAULT_PRICES, now: NOW });
  appendFileSync(f, line({ id: "m2", req: "req2", output: 500_000 }) + "\n");
  syncClaude(store, { root: claudeRoot, prices: DEFAULT_PRICES, now: NOW });
  syncClaude(store, { root: claudeRoot, prices: DEFAULT_PRICES, now: NOW });
  expect(store.total()).toBe(3000);
});

test("a file that shrinks is re-read from the start", () => {
  const { proj, claudeRoot, store } = setup();
  const f = join(proj, "a.jsonl");
  writeFileSync(f, line({ id: "m1", output: 1_000_000 }) + "\n" + line({ id: "m2", req: "r2", output: 1 }) + "\n");
  syncClaude(store, { root: claudeRoot, prices: DEFAULT_PRICES, now: NOW });
  writeFileSync(f, line({ id: "m3", req: "r3", output: 500_000 }) + "\n");
  syncClaude(store, { root: claudeRoot, prices: DEFAULT_PRICES, now: NOW });
  expect(store.total()).toBe(3000); // m1 + m3
});

test("events older than the 7-day window are not imported", () => {
  const { proj, claudeRoot, store } = setup();
  writeFileSync(
    join(proj, "a.jsonl"),
    [line({ id: "old", at: iso(10, -5), output: 1_000_000 }), line({ id: "new", req: "r2", output: 1_000_000 })].join("\n") + "\n",
  );
  syncClaude(store, { root: claudeRoot, prices: DEFAULT_PRICES, now: NOW });
  expect(store.total()).toBe(2000);
  expect(store.total("2026-09-25")).toBe(0);
});

test("files untouched for longer than the window are skipped, and stay skipped", () => {
  const { proj, claudeRoot, store } = setup();
  const f = join(proj, "a.jsonl");
  writeFileSync(f, line({ id: "old", output: 1_000_000 }) + "\n");
  const old = new Date(NOW.getTime() - 30 * 86_400_000);
  utimesSync(f, old, old);
  syncClaude(store, { root: claudeRoot, prices: DEFAULT_PRICES, now: NOW });
  syncClaude(store, { root: claudeRoot, prices: DEFAULT_PRICES, now: NOW });
  expect(store.total()).toBe(0);
});

// ---- createSyncer: alerting behavior ----

const bump = (file: string) => {
  const t = new Date(Date.now() + 5000 * Math.random() + 5000);
  utimesSync(file, t, t);
};
const withOutputPrice = (price: number) => {
  const t = structuredClone(DEFAULT_PRICES);
  t["claude-opus-5-5"]!.output = price;
  return JSON.stringify(t);
};

test("first sync is quiet even past a milestone; later crossing alerts", () => {
  const { proj, claudeRoot, pricesFile, store } = setup();
  const f = join(proj, "a.jsonl");
  writeFileSync(f, line({ id: "m1", output: 1_500_000 }) + "\n"); // $30, past the $25 milestone
  const sync = createSyncer(store, { claudeRoot, pricesFile, now: NOW });
  const first = sync();
  expect(first.totalCents).toBe(3000);
  expect(first.alert).toBeNull();
  expect(sync().alert).toBeNull();
  appendFileSync(f, line({ id: "m2", req: "r2", output: 1_000_000 }) + "\n"); // +$20 = $50
  const next = sync();
  expect(next.alert?.crossed).toBe(1);
  expect(next.alert?.nextCents).toBe(7500);
});

test("raising a price that crosses a milestone alerts; lowering one does not", () => {
  const { proj, claudeRoot, pricesFile, store } = setup();
  writeFileSync(join(proj, "a.jsonl"), line({ id: "m1", output: 1_000_000 }) + "\n"); // $20 at $20/MTok
  const sync = createSyncer(store, { claudeRoot, pricesFile, now: NOW });
  expect(sync().totalCents).toBe(2000);

  writeFileSync(pricesFile, withOutputPrice(30)); // $30 total, crosses $25
  bump(pricesFile);
  const up = sync();
  expect(up.totalCents).toBe(3000);
  expect(up.alert?.crossed).toBe(1);

  writeFileSync(pricesFile, withOutputPrice(10)); // $10 total
  bump(pricesFile);
  const down = sync();
  expect(down.totalCents).toBe(1000);
  expect(down.alert).toBeNull();
});

test("unknown models are counted as $0 and reported", () => {
  const { proj, claudeRoot, pricesFile, store } = setup();
  writeFileSync(
    join(proj, "a.jsonl"),
    line({ id: "m1", model: "claude-future-9", output: 1_000_000 }) + "\n" + line({ id: "m2", req: "r2", output: 1_000_000 }) + "\n",
  );
  const r = createSyncer(store, { claudeRoot, pricesFile, now: NOW })();
  expect(r.unknownModels).toEqual(["claude-future-9"]);
  expect(r.totalCents).toBe(2000);
});

test("an invalid prices.json falls back to defaults and reports the error", () => {
  const { proj, claudeRoot, pricesFile, store } = setup();
  writeFileSync(join(proj, "a.jsonl"), line({ id: "m1", output: 1_000_000 }) + "\n");
  writeFileSync(pricesFile, "{ nope");
  const r = createSyncer(store, { claudeRoot, pricesFile, now: NOW })();
  expect(r.pricesError).toContain("not valid JSON");
  expect(r.totalCents).toBe(2000);
});

test("reset hides logged usage and a re-sync does not bring it back", () => {
  const { proj, claudeRoot, pricesFile, store } = setup();
  const f = join(proj, "a.jsonl");
  writeFileSync(f, line({ id: "m1", at: iso(9), output: 1_000_000 }) + "\n");
  const sync = createSyncer(store, { claudeRoot, pricesFile, now: NOW });
  expect(sync().totalCents).toBe(2000);
  store.resetDay();
  expect(sync().totalCents).toBe(0);
  appendFileSync(f, line({ id: "m2", req: "r2", at: iso(13), output: 500_000 }) + "\n"); // after the cutoff (12:00)
  expect(sync().totalCents).toBe(1000);
});

test("clearing manual spend keeps logged usage and re-baselines silently", () => {
  const { proj, claudeRoot, pricesFile, store } = setup();
  writeFileSync(join(proj, "a.jsonl"), line({ id: "m1", output: 1_000_000 }) + "\n"); // $20 real
  const sync = createSyncer(store, { claudeRoot, pricesFile, now: NOW });
  sync();
  expect(addSpend(store, 3000).alert?.crossed).toBe(2); // $50 total: crosses $25 and $50
  clearManualSpend(store);
  expect(store.total()).toBe(2000);
  expect(sync().alert).toBeNull();
  expect(addSpend(store, 600).alert?.crossed).toBe(1); // $26: crosses $25 again, so alerts are retestable
});
