import type { Provider } from "../types.ts";
import { windowStart } from "../window.ts";
import { syncClaude, SOURCE_ID } from "./ingest.ts";
import { claudeRoot } from "./paths.ts";
import { CLAUDE_DEFAULT_PRICES } from "./prices.ts";

export const claudeCode: Provider = {
  id: "claude-code",
  label: "Claude Code",
  sources: [{ id: SOURCE_ID, label: "Claude Code", accuracy: "estimated", tokenPriced: true }],
  defaultPrices: CLAUDE_DEFAULT_PRICES,
  sync(ctx) {
    syncClaude(ctx.store, {
      root: ctx.roots?.["claude-code"] ?? claudeRoot(),
      prices: ctx.prices,
      windowStart: windowStart(ctx),
    });
  },
};
