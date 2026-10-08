import type { PriceTable } from "../../core/pricing.ts";

/**
 * Used only for the VS Code estimate (the CLI reports its own cost). $ per million tokens, from GitHub's
 * published per-model prices and the model catalogue VS Code caches. VS Code logs no cache-write usage,
 * so cache5m/cache1h mirror the input price and are never used.
 */
const p = (input: number, output: number, cacheRead: number) => ({
  input,
  output,
  cacheRead,
  cache5m: input,
  cache1h: input,
});

export const COPILOT_DEFAULT_PRICES: PriceTable = {
  "copilot/claude-haiku-4.5": p(1, 5, 0.1),
  "copilot/claude-opus-4.5": p(5, 25, 0.5),
  "copilot/claude-opus-4.6": p(5, 25, 0.5),
  "copilot/claude-opus-4.7": p(5, 25, 0.5),
  "copilot/claude-opus-4.8": p(5, 25, 0.5),
  "copilot/claude-sonnet-4.5": p(3, 15, 0.3),
  "copilot/claude-sonnet-4.6": p(3, 15, 0.3),
  "copilot/claude-sonnet-5.5": p(2, 10, 0.1),
  "copilot/gemini-2.5-pro": p(1.25, 10, 0.12),
  "copilot/gemini-3-flash-preview": p(0.5, 3, 0.05),
  "copilot/gemini-3.1-pro-preview": p(2, 12, 0.2),
  "copilot/gemini-3.5-flash": p(1.5, 9, 0.15),
  "copilot/gpt-4.1": p(2, 8, 0.5),
  "copilot/gpt-4o": p(2.5, 10, 1.25),
  "copilot/gpt-4o-mini": p(0.3, 1.2, 0.15),
  "copilot/gpt-5-mini": p(0.25, 2, 0.02),
  "copilot/gpt-5.3-codex": p(1.75, 14, 0.17),
  "copilot/gpt-5.4": p(2.5, 15, 0.25),
  "copilot/gpt-5.4-mini": p(0.75, 4.5, 0.07),
  "copilot/gpt-5.5": p(5, 30, 0.5),
  "copilot/gpt-6-luna": p(0.1, 0.5, 0.01),
};
