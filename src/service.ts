import { evaluate, type AlertResult } from "./core/alerts.ts";
import { Store, type Settings } from "./db/store.ts";

/**
 * Record a spend event and report any newly crossed milestones.
 * The high-water mark is advanced even when alerts are disabled, so
 * re-enabling later does not replay old milestones.
 */
export function addSpend(store: Store, cents: number): { totalCents: number; alert: AlertResult | null } {
  store.addSpend(cents);
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

/**
 * Save settings. Changing the interval or the day-start hour moves the milestone grid
 * or re-buckets spend, so today's baseline is reset to the current milestone: no alert
 * fires as a side effect of editing a setting. Returns true when the baseline was reset.
 */
export function updateSettings(store: Store, next: Settings): boolean {
  const prev = store.getSettings();
  store.saveSettings(next);
  if (prev.intervalCents === next.intervalCents && prev.dayStartHour === next.dayStartHour) return false;
  const reached = Math.floor(store.total() / next.intervalCents) * next.intervalCents;
  store.setLastAlerted(reached);
  return true;
}
