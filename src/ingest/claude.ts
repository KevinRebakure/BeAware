import { closeSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { costMicros, priceFor, type PriceTable, type Usage } from "../core/pricing.ts";
import type { Store } from "../db/store.ts";

export type ClaudeEvent = { key: string; model: string; at: string; usage: Usage };

export function claudeRoot(): string {
  const base = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
  return join(base, "projects");
}

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

function listJsonl(root: string): string[] {
  try {
    return readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((p) => p.endsWith(".jsonl"))
      .map((p) => join(root, p));
  } catch {
    return []; // no Claude Code logs on this machine
  }
}

function readFrom(path: string, offset: number, size: number): Buffer {
  const buf = Buffer.alloc(size - offset);
  const fd = openSync(path, "r");
  try {
    readSync(fd, buf, 0, buf.length, offset);
  } finally {
    closeSync(fd);
  }
  return buf;
}

export type SyncOptions = { root?: string; prices: PriceTable; now?: Date; windowDays?: number };

/**
 * Import new usage from Claude Code's session logs. Each file is read from its saved offset up to the
 * last complete line, so a half-written line is picked up next time. A response is logged once per
 * content block with the same message+request id; the last line wins. Returns the number of events written.
 */
export function syncClaude(store: Store, opts: SyncOptions): number {
  const windowStart = (opts.now ?? new Date()).getTime() - (opts.windowDays ?? 7) * 86_400_000;
  let written = 0;
  store.tx(() => {
    for (const path of listJsonl(opts.root ?? claudeRoot())) {
      let st;
      try {
        st = statSync(path);
      } catch {
        continue;
      }
      let offset = store.getOffset(path);
      if (offset === null && st.mtimeMs < windowStart) {
        store.setOffset(path, st.size); // too old to matter; don't read it later either
        continue;
      }
      if (offset === null || st.size < offset) offset = 0; // new file, or truncated/rewritten
      if (st.size === offset) continue;

      const buf = readFrom(path, offset, st.size);
      const end = buf.lastIndexOf(0x0a);
      if (end === -1) continue;
      for (const line of buf.subarray(0, end + 1).toString("utf8").split("\n")) {
        const ev = parseLine(line);
        if (!ev || new Date(ev.at).getTime() < windowStart) continue;
        const p = priceFor(ev.model, opts.prices);
        store.upsertClaude(ev, p ? costMicros(ev.usage, p) : 0);
        written++;
      }
      store.setOffset(path, offset + end + 1);
    }
  });
  return written;
}
