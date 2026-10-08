import type { PriceTable } from "../../core/pricing.ts";

export const CLAUDE_DEFAULT_PRICES: PriceTable = {
  "claude-opus-5-5": { input: 4, output: 20, cache5m: 5, cache1h: 8, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cache5m: 2.5, cache1h: 4, cacheRead: 0.2 },
  "claude-sonnet-5": { input: 2, output: 10, cache5m: 2.5, cache1h: 4, cacheRead: 0.2 },
  "claude-sonnet-4-6": { input: 3, output: 15, cache5m: 3.75, cache1h: 6, cacheRead: 0.3 },
  "claude-haiku-4-5": { input: 1, output: 5, cache5m: 1.25, cache1h: 2, cacheRead: 0.1 },
};
