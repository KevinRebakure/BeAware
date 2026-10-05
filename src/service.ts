import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { evaluate, type AlertResult } from "./core/alerts.ts";
import { costMicros, DEFAULT_PRICES, priceFor, validatePrices, type PriceTable } from "./core/pricing.ts";
import { pricesPath } from "./db/paths.ts";
import { Store, type Settings } from "./db/store.ts";
import { syncClaude } from "./ingest/claude.ts";

export type CheckResult = { totalCents: number; alert: AlertResult | null };

/**
 * Compare today's total with the alert baseline and report newly crossed milestones.
 * The high-water mark is advanced even when alerts are disabled, so re-enabling
 * later does not replay old milestones.
 */
export function checkAlerts(store: Store): CheckResult {
  const totalCents = store.total();
  const settings = store.getSettings();
  const result = evaluate({
    totalCents,
    intervalCents: settings.intervalCents,
    lastAlertedCents: store.lastAlerted(),
  });
  if (result.crossed > 0) store.setLastAlerted(result.reachedCents);
  return { totalCents, alert: settings.enabled && result.crossed > 0 ? result : null };
}

/** Record manual spend (in cents) and report any newly crossed milestones. */
export function addSpend(store: Store, cents: number): CheckResult {
  store.addSpend(cents);
  return checkAlerts(store);
}

/** Move today's baseline to the current milestone without alerting. */
function rebaseline(store: Store) {
  const interval = store.getSettings().intervalCents;
  store.setLastAlerted(Math.floor(store.total() / interval) * interval);
}

/** Remove manually added spend and silently move today's baseline to the new total. */
export function clearManualSpend(store: Store) {
  store.clearManual();
  rebaseline(store);
}

/**
 * Save settings. Changing the interval or the day-start hour moves the milestone grid
 * or re-buckets spend, so today's baseline is reset to the current milestone: no alert
 * fires as a side effect of editing a setting. Returns true when the baseline was reset.
 */
export function updateSettings(store: Store, next: Settings): boolean {
  const prev = store.getSettings();
  store.saveSettings(next);
  if (prev.intervalCents === next.intervalCents && prev.dayStartHour === next.dayStartHour) return false;
  rebaseline(store);
  return true;
}

export type SyncResult = CheckResult & {
  /** Models in the logs that have no price (counted as $0). */
  unknownModels: string[];
  /** Set when prices.json is unreadable or invalid; built-in defaults are used meanwhile. */
  pricesError: string | null;
};

export type SyncOptions = { claudeRoot?: string; pricesFile?: string; now?: Date };

/** Load prices.json (writing the defaults on first run). Throws a message string-ish Error on bad content. */
function loadPrices(file: string): PriceTable {
  if (!existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(DEFAULT_PRICES, null, 2) + "\n");
    return DEFAULT_PRICES;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`prices.json is not valid JSON`);
  }
  const v = validatePrices(parsed);
  if ("error" in v) throw new Error(v.error);
  return v.table;
}

/**
 * Pull new Claude Code usage into the store and check alerts. Prices are reloaded when
 * prices.json changes and stored usage is repriced; if that pushes today's total over a
 * milestone the alert fires like any other. The very first sync is quiet: usage that
 * already exists is treated as seen.
 */
export function createSyncer(store: Store, opts: SyncOptions = {}) {
  const file = opts.pricesFile ?? pricesPath();
  let table: PriceTable = DEFAULT_PRICES;
  let stamp = "";
  let pricesError: string | null = null;

  return function sync(): SyncResult {
    let current = "";
    try {
      const st = statSync(file);
      current = `${st.mtimeMs}:${st.size}`;
    } catch {
      current = "missing";
    }
    if (current !== stamp) {
      stamp = current;
      try {
        table = loadPrices(file);
        pricesError = null;
      } catch (e) {
        table = DEFAULT_PRICES;
        pricesError = (e as Error).message;
      }
      store.repriceClaude((model, usage) => {
        const p = priceFor(model, table);
        return p ? costMicros(usage, p) : 0;
      });
    }

    const first = store.isFirstSync();
    syncClaude(store, { root: opts.claudeRoot, prices: table, now: opts.now });

    let check: CheckResult;
    if (first) {
      rebaseline(store);
      store.markSynced();
      check = { totalCents: store.total(), alert: null };
    } else {
      check = checkAlerts(store);
    }
    const unknownModels = store.claudeModels().filter((m) => !priceFor(m, table));
    return { ...check, unknownModels, pricesError };
  };
}
