import type { PriceTable } from "../core/pricing.ts";
import { claudeCode } from "./claude-code/index.ts";
import { copilot } from "./copilot/index.ts";
import type { Provider } from "./types.ts";

/** The only file that lists providers. Adding one means adding a folder and a line here. */
export const PROVIDERS: Provider[] = [claudeCode, copilot];

export const SOURCES = PROVIDERS.flatMap((p) => p.sources);

/** Every provider's default prices in one flat table (model ids are namespaced where they could collide). */
export const DEFAULT_PRICES: PriceTable = Object.assign({}, ...PROVIDERS.map((p) => p.defaultPrices));
