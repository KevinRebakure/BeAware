import { closeSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { costMicros, priceFor, type PriceTable } from "../../core/pricing.ts";
import type { Store } from "../../db/store.ts";
import { parseLine } from "./parse.ts";

export const SOURCE_ID = "claude-code";

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

/**
 * Import new usage from Claude Code's session logs. Each file is read from its saved offset up to the
 * last complete line, so a half-written line is picked up next time. A response is logged once per
 * content block with the same message+request id; the last line wins. Returns the number of events written.
 */
export function syncClaude(store: Store, opts: { root: string; prices: PriceTable; windowStart: number }): number {
  let written = 0;
  store.tx(() => {
    for (const path of listJsonl(opts.root)) {
      let st;
      try {
        st = statSync(path);
      } catch {
        continue;
      }
      const saved = store.getCursor(path);
      let offset = saved === null ? null : Number(saved);
      if (offset === null && st.mtimeMs < opts.windowStart) {
        store.setCursor(path, String(st.size)); // too old to matter; don't read it later either
        continue;
      }
      if (offset === null || st.size < offset) offset = 0; // new file, or truncated/rewritten
      if (st.size === offset) continue;

      const buf = readFrom(path, offset, st.size);
      const end = buf.lastIndexOf(0x0a);
      if (end === -1) continue;
      for (const line of buf.subarray(0, end + 1).toString("utf8").split("\n")) {
        const ev = parseLine(line);
        if (!ev || new Date(ev.at).getTime() < opts.windowStart) continue;
        const p = priceFor(ev.model, opts.prices);
        store.upsertEvent({ ...ev, sourceId: SOURCE_ID, providerId: SOURCE_ID }, p ? costMicros(ev.usage, p) : 0);
        written++;
      }
      store.setCursor(path, String(offset + end + 1));
    }
  });
  return written;
}
