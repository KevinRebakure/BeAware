import { MANUAL, MICROS_PER_CENT } from "../db/repositories/spendEvents.ts";
import type { BreakdownRow } from "../db/store.ts";
import { PROVIDERS } from "./registry.ts";
import type { Accuracy, Provider } from "./types.ts";

/** How a source's dollars were arrived at, as shown next to them. */
export type Tag = "est." | "reported" | "entered";

export type SourceShare = { label: string; tag: Tag; cents: number };
/** `sources` lists only sources that have spend today; `tags` is every tag the provider's sources can carry. */
export type ProviderShare = {
  id: string;
  label: string;
  color?: string;
  cents: number;
  percent: number;
  sources: SourceShare[];
  tags: Tag[];
};

const TAG: Record<Accuracy, Tag> = { estimated: "est.", reported: "reported" };

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Whole-number percentages of `total` that add up to exactly 100 (largest-remainder rounding). All 0 when total is 0. */
function roundPercents(values: number[], total: number): number[] {
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((v) => (v / total) * 100);
  const percents = exact.map(Math.floor);
  const byRemainder = exact.map((x, i) => [x - percents[i]!, i] as const).sort((a, b) => b[0] - a[0]);
  let leftover = 100 - sum(percents);
  for (const [, i] of byRemainder) if (leftover-- > 0) percents[i]!++;
  return percents;
}

/**
 * Group today's per-source spend by provider with each provider's share of the total.
 * Every registered provider is listed, even at $0, so a tool with no usage today is still visible; manual
 * spend only appears once there is some.
 */
export function summarize(rows: BreakdownRow[], providers: Provider[] = PROVIDERS): ProviderShare[] {
  const microsBySource = new Map<string, number>();
  for (const r of rows) microsBySource.set(r.sourceId, (microsBySource.get(r.sourceId) ?? 0) + r.micros);
  const spent = (sourceId: string) => microsBySource.get(sourceId) ?? 0;

  const groups = [
    ...providers.map((p) => ({
      id: p.id,
      label: p.label,
      color: p.color,
      alwaysShown: true,
      sources: p.sources.map((s) => ({ label: s.label, tag: TAG[s.accuracy], micros: spent(s.id) })),
    })),
    { id: MANUAL, label: "Manual", color: "gray", alwaysShown: false, sources: [{ label: "Manual", tag: "entered" as Tag, micros: spent(MANUAL) }] },
  ].map((g) => ({ ...g, micros: sum(g.sources.map((s) => s.micros)) }));

  const shown = groups.filter((g) => g.alwaysShown || g.micros > 0);
  const percents = roundPercents(shown.map((g) => g.micros), sum(rows.map((r) => r.micros)));
  const cents = (micros: number) => Math.floor(micros / MICROS_PER_CENT);

  return shown.map((g, i) => ({
    id: g.id,
    label: g.label,
    color: g.color,
    cents: cents(g.micros),
    percent: percents[i]!,
    tags: [...new Set(g.sources.map((s) => s.tag))],
    sources: g.sources.filter((s) => s.micros > 0).map((s) => ({ label: s.label, tag: s.tag, cents: cents(s.micros) })),
  }));
}
