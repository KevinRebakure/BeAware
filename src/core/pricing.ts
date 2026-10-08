/** Prices in dollars per million tokens. */
export type Prices = { input: number; output: number; cache5m: number; cache1h: number; cacheRead: number };
export type PriceTable = Record<string, Prices>;

export type Usage = { input: number; output: number; cacheRead: number; cache5m: number; cache1h: number };

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

/** Cost in micro-dollars of `usage` on `model`, or 0 when the model has no price (it is reported as unpriced). */
export function tokenCost(usage: Usage, model: string, table: PriceTable): number {
  const p = priceFor(model, table);
  return p ? costMicros(usage, p) : 0;
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
