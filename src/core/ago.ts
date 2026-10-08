/** "12s ago" / "3m ago"; "never" for a missing time. */
export function formatAgo(d: Date | null, now = new Date()): string {
  if (!d) return "never";
  const s = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`;
}
