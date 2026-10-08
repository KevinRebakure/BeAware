import type { Usage } from "../../core/pricing.ts";

export type ClaudeEvent = { key: string; model: string; at: string; usage: Usage };

/** One log line -> a usage event, or null for anything that isn't a priced assistant response. */
export function parseLine(line: string): ClaudeEvent | null {
  if (!line.includes('"usage"')) return null;
  let d: any;
  try {
    d = JSON.parse(line);
  } catch {
    return null;
  }
  const m = d?.message;
  if (d?.type !== "assistant" || !m?.usage || typeof m.id !== "string" || typeof m.model !== "string") return null;
  if (m.model.startsWith("<")) return null; // "<synthetic>" placeholder messages
  const at = new Date(d.timestamp);
  if (Number.isNaN(at.getTime())) return null;
  const u = m.usage;
  const cc = u.cache_creation;
  return {
    key: `${m.id}:${d.requestId ?? ""}`,
    model: m.model,
    at: at.toISOString(),
    usage: {
      input: u.input_tokens ?? 0,
      output: u.output_tokens ?? 0,
      cacheRead: u.cache_read_input_tokens ?? 0,
      cache5m: cc ? (cc.ephemeral_5m_input_tokens ?? 0) : (u.cache_creation_input_tokens ?? 0),
      cache1h: cc ? (cc.ephemeral_1h_input_tokens ?? 0) : 0,
    },
  };
}
