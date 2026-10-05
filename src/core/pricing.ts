/** Prices in dollars per million tokens. */
export type Prices = { input: number; output: number; cache5m: number; cache1h: number; cacheRead: number };
export type PriceTable = Record<string, Prices>;

export type Usage = { input: number; output: number; cacheRead: number; cache5m: number; cache1h: number };

export const DEFAULT_PRICES: PriceTable = {
  "claude-opus-5-5": { input: 4, output: 20, cache5m: 5, cache1h: 8, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cache5m: 2.5, cache1h: 4, cacheRead: 0.2 },
  "claude-sonnet-5": { input: 2, output: 10, cache5m: 2.5, cache1h: 4, cacheRead: 0.2 },
  "claude-sonnet-4-6": { input: 3, output: 15, cache5m: 3.75, cache1h: 6, cacheRead: 0.3 },
  "claude-haiku-4-5": { input: 1, output: 5, cache5m: 1.25, cache1h: 2, cacheRead: 0.1 },
};

const FIELDS = ["input", "output", "cache5m", "cache1h", "cacheRead"] as const;

/** Exact id first, then the id without a trailing -YYYYMMDD snapshot suffix. */
export function priceFor(model: string, table: PriceTable): Prices | null {
  return table[model] ?? table[model.replace(/-\d{8}$/, "")] ?? null;
}

/** Cost in micro-dollars. $/MTok x tokens is exactly micro-dollars, so we only round once at the end. */
export function costMicros(u: Usage, p: Prices): number {
  return Math.round(
    u.input * p.input + u.output * p.output + u.cache5m * p.cache5m + u.cache1h * p.cache1h + u.cacheRead * p.cacheRead,
  );
}

/** Validate parsed JSON as a price table. Returns an error message or null. */
export function validatePrices(x: unknown): { table: PriceTable } | { error: string } {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return { error: "prices.json must be an object of models" };
  for (const [model, p] of Object.entries(x)) {
    for (const f of FIELDS) {
      const v = (p as Record<string, unknown> | null)?.[f];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return { error: `prices.json: ${model}.${f} must be a number >= 0` };
    }
  }
  return { table: x as PriceTable };
}
