/** Money is stored as integer cents everywhere; dollars only appear at the display edge. */

/** Parse "4.25", "$4.25", "4" into cents. Returns null for invalid or non-positive-precision input. */
export function parseCents(input: string): number | null {
  const m = input.trim().replace(/^\$/, "").match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || 0);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatCents(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, "0");
  return `$${dollars.toLocaleString("en-US")}.${rest}`;
}
