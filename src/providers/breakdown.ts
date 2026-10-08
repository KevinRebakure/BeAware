import { MICROS_PER_CENT } from "../db/repositories/spendEvents.ts";
import type { BreakdownRow } from "../db/store.ts";
import { PROVIDERS } from "./registry.ts";
import type { Accuracy, Provider } from "./types.ts";

/** How a source's dollars were arrived at, as shown next to them. */
export type Tag = "est." | "reported" | "entered";

export type SourceShare = { label: string; tag: Tag; cents: number };
/** `sources` lists only sources that have spend today; `tags` is every tag the provider's sources can carry. */
export type ProviderShare = { id: string; label: string; cents: number; percent: number; sources: SourceShare[]; tags: Tag[] };

const TAG: Record<Accuracy, Tag> = { estimated: "est.", reported: "reported" };
const MANUAL_ID = "manual";

/**
 * Group today's per-source spend by provider with each provider's share of the total.
 * Percentages are whole numbers that always add up to 100 (largest-remainder rounding).
 * Every registered provider is listed, even at $0, so a tool with no usage today is still visible; manual
 * spend only appears once there is some.
 */
export function summarize(rows: BreakdownRow[], providers: Provider[] = PROVIDERS): ProviderShare[] {
  const total = rows.reduce((sum, r) => sum + r.micros, 0);

  const spent = (match: (r: BreakdownRow) => boolean) => rows.filter(match).reduce((sum, r) => sum + r.micros, 0);

  const groups = providers.map((p) => ({
    id: p.id,
    label: p.label,
    tags: [...new Set(p.sources.map((s) => TAG[s.accuracy]))],
    sources: p.sources.map((s) => ({ label: s.label, tag: TAG[s.accuracy], micros: spent((r) => r.sourceId === s.id) })),
  }));
  groups.push({
    id: MANUAL_ID,
    label: "Manual",
    tags: ["entered"],
    sources: [{ label: "Manual", tag: "entered", micros: spent((r) => r.providerId === MANUAL_ID) }],
  });

  const shares = groups
    .map((g) => ({ ...g, sources: g.sources.filter((s) => s.micros > 0) }))
    .map((g) => ({ ...g, micros: g.sources.reduce((sum, s) => sum + s.micros, 0) }))
    .filter((g) => g.micros > 0 || g.id !== MANUAL_ID);

  const exact = shares.map((p) => (total > 0 ? (p.micros / total) * 100 : 0));
  const floors = exact.map(Math.floor);
  let leftover = total > 0 ? 100 - floors.reduce((a, b) => a + b, 0) : 0;
  const byRemainder = exact.map((x, i) => [x - floors[i]!, i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of byRemainder) if (leftover-- > 0) floors[i]!++;

  const cents = (micros: number) => Math.floor(micros / MICROS_PER_CENT);
  return shares.map((p, i) => ({
    id: p.id,
    label: p.label,
    cents: cents(p.micros),
    percent: floors[i]!,
    tags: p.tags,
    sources: p.sources.map((s) => ({ label: s.label, tag: s.tag, cents: cents(s.micros) })),
  }));
}
