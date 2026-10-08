import type { PriceTable } from "../core/pricing.ts";
import type { Store } from "../db/store.ts";

/** `estimated`: tokens x local prices. `reported`: a cost the tool itself recorded. */
export type Accuracy = "estimated" | "reported";

/** One place a provider reads usage from. Rows are tagged with the source id; accuracy follows from it. */
export type Source = {
  id: string;
  label: string;
  accuracy: Accuracy;
  /** True when cost is computed from tokens x prices.json, so it is recomputed when prices change. */
  tokenPriced: boolean;
};

export type SyncContext = {
  store: Store;
  prices: PriceTable;
  now?: Date;
  /** Test/override hook: where to read data from, keyed by provider id (or source id where a provider has several locations). */
  roots?: Partial<Record<string, string>>;
};

export interface Provider {
  id: string;
  label: string;
  sources: Source[];
  defaultPrices: PriceTable;
  /** Import new usage for all of this provider's sources. */
  sync(ctx: SyncContext): void;
}
