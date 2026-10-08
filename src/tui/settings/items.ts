import { formatHour } from "../../core/day.ts";
import { formatCents } from "../../core/money.ts";
import type { Settings } from "../../db/store.ts";

export type ItemId = "enabled" | "interval" | "dayStart" | "resetManual";

/** The rows of the settings screen, in order. */
export const ITEMS: { id: ItemId; label: string }[] = [
  { id: "enabled", label: "Alerts enabled" },
  { id: "interval", label: "Alert every" },
  { id: "dayStart", label: "Day starts at" },
  { id: "resetManual", label: "Reset manual spend" },
];

/** Shown before the input while a value is being edited. */
export const EDIT_PREFIX: Partial<Record<ItemId, string>> = { interval: "$ ", dayStart: "hour " };

export const BASELINE_NOTE = "Alert baseline reset — no alert fired for this change.";

export function displayValue(id: ItemId, s: Settings): string {
  if (id === "enabled") return s.enabled ? "● on" : "○ off";
  if (id === "interval") return formatCents(s.intervalCents);
  if (id === "dayStart") return formatHour(s.dayStartHour);
  return "";
}

export function valueColor(id: ItemId, s: Settings): string | undefined {
  if (id !== "enabled") return undefined;
  return s.enabled ? "green" : "gray";
}
