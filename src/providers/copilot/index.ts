import type { Provider } from "../types.ts";
import { windowStart } from "../window.ts";
import { CLI_SOURCE_ID, syncCopilotCli } from "./cli.ts";
import { cliDbPath, vscodeWorkspaceStorage } from "./paths.ts";
import { COPILOT_DEFAULT_PRICES } from "./prices.ts";
import { syncCopilotVscode, VSCODE_SOURCE_ID } from "./vscode.ts";

export const copilot: Provider = {
  id: "copilot",
  label: "GitHub Copilot",
  color: "#8957e5", // GitHub Copilot purple
  sources: [
    { id: CLI_SOURCE_ID, label: "Copilot CLI", accuracy: "reported", tokenPriced: false },
    { id: VSCODE_SOURCE_ID, label: "VS Code Chat", accuracy: "estimated", tokenPriced: true },
  ],
  defaultPrices: COPILOT_DEFAULT_PRICES,
  sync(ctx) {
    const since = windowStart(ctx);
    // Independent sources: one failing (e.g. a locked database) must not hide the other's usage.
    const errors: string[] = [];
    const run = (name: string, fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        errors.push(`${name}: ${(e as Error).message}`);
      }
    };
    run(CLI_SOURCE_ID, () =>
      syncCopilotCli(ctx.store, {
        dbPath: ctx.roots?.[CLI_SOURCE_ID] ?? cliDbPath(),
        windowStart: since,
      }),
    );
    run(VSCODE_SOURCE_ID, () =>
      syncCopilotVscode(ctx.store, {
        root: ctx.roots?.[VSCODE_SOURCE_ID] ?? vscodeWorkspaceStorage(),
        prices: ctx.prices,
        windowStart: since,
      }),
    );
    if (errors.length > 0) throw new Error(errors.join("; "));
  },
};
