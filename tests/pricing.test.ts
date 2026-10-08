import { expect, test } from "bun:test";
import { costMicros, priceFor, validatePrices } from "../src/core/pricing.ts";
import { DEFAULT_PRICES } from "../src/providers/registry.ts";

test("matches exact ids and strips a trailing snapshot date", () => {
  expect(priceFor("claude-opus-5-5", DEFAULT_PRICES)).toBe(DEFAULT_PRICES["claude-opus-5-5"]!);
  expect(priceFor("claude-haiku-4-5-20251001", DEFAULT_PRICES)).toBe(DEFAULT_PRICES["claude-haiku-4-5"]!);
  expect(priceFor("claude-unknown-9", DEFAULT_PRICES)).toBeNull();
});

test("cost is tokens x $/MTok in micro-dollars", () => {
  const p = DEFAULT_PRICES["claude-opus-5-5"]!;
  // 1M input at $4 = $4.00 = 4,000,000 micros
  expect(costMicros({ input: 1_000_000, output: 0, cacheRead: 0, cache5m: 0, cache1h: 0 }, p)).toBe(4_000_000);
  // mixed: 1000 in, 500 out, 20000 cache read, 10000 1h write
  expect(costMicros({ input: 1000, output: 500, cacheRead: 20_000, cache5m: 0, cache1h: 10_000 }, p)).toBe(
    1000 * 4 + 500 * 20 + 20_000 * 0.2 + 10_000 * 8,
  );
});

test("validates a price file", () => {
  expect("table" in validatePrices({ m: { input: 1, output: 2, cache5m: 1, cache1h: 2, cacheRead: 0.1 } })).toBe(true);
  expect("error" in validatePrices({ m: { input: -1, output: 2, cache5m: 1, cache1h: 2, cacheRead: 0.1 } })).toBe(true);
  expect("error" in validatePrices({ m: { input: 1 } })).toBe(true);
  expect("error" in validatePrices([])).toBe(true);
});
