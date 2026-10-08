import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { costMicros, priceFor, type PriceTable } from "../../core/pricing.ts";
import type { Store } from "../../db/store.ts";
import { copilotModel } from "./model.ts";

export const VSCODE_SOURCE_ID = "copilot-vscode";

type Json = any;

/**
 * A chat session file is a patch log: `{kind:0, v}` is the full snapshot, `{kind:1, k, v}` sets the value at
 * path `k`, `{kind:2, k, v, i?}` splices array `v` into the array at `k` (at index `i`, else appended).
 * Replaying it gives the final session state.
 */
export function replayPatchLog(text: string): Json {
  let state: Json = {};
  for (const line of text.split("\n")) {
    if (!line) continue;
    let p: Json;
    try {
      p = JSON.parse(line);
    } catch {
      continue; // half-written last line; picked up on the next change
    }
    if (p.kind === 0) {
      state = p.v;
      continue;
    }
    const path: (string | number)[] = p.k ?? [];
    let node = state;
    for (const seg of path.slice(0, -1)) node = node?.[seg];
    if (node == null) continue;
    const last = path[path.length - 1]!;
    if (p.kind === 1) node[last] = p.v;
    else if (p.kind === 2) {
      const arr: Json[] = (node[last] ??= []);
      arr.splice(typeof p.i === "number" ? p.i : arr.length, 0, ...p.v);
    }
  }
  return state;
}

export type ChatRequest = { key: string; model: string; at: string; input: number; output: number };

const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);

/**
 * Privacy: reads only ids, the model, a timestamp and token counts out of the session state; the prompt and
 * response text in the same file is never copied. Requests still in flight (no token counts yet) are skipped.
 */
export function extractRequests(state: Json, fallbackSessionId: string): ChatRequest[] {
  const session = typeof state?.sessionId === "string" ? state.sessionId : fallbackSessionId;
  const out: ChatRequest[] = [];
  for (const r of Array.isArray(state?.requests) ? state.requests : []) {
    const meta = r?.result?.metadata;
    const input = num(meta?.promptTokens);
    const output = num(meta?.outputTokens) ?? num(r?.completionTokens);
    const at = new Date(num(r?.timestamp) ?? NaN);
    const model = typeof meta?.resolvedModel === "string" ? meta.resolvedModel : r?.modelId;
    if (typeof r?.requestId !== "string" || typeof model !== "string" || Number.isNaN(at.getTime())) continue;
    if (input === null && output === null) continue;
    out.push({ key: `${session}:${r.requestId}`, model: copilotModel(model), at: at.toISOString(), input: input ?? 0, output: output ?? 0 });
  }
  return out;
}

function listChatSessions(root: string): string[] {
  try {
    return readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((p) => /(^|\/)chatSessions\/[^/]+\.jsonl$/.test(p))
      .map((p) => join(root, p));
  } catch {
    return []; // VS Code isn't installed
  }
}

/**
 * Import token usage from VS Code Copilot Chat sessions. VS Code logs no cost, so cost is estimated
 * (tokens x prices.json), and no cache usage, so the estimate can only over-count. A session file is
 * replayed whenever it changes; upserts by request id keep that idempotent. Returns events written.
 */
export function syncCopilotVscode(
  store: Store,
  opts: { root: string; prices: PriceTable; windowStart: number },
): number {
  let written = 0;
  store.tx(() => {
    for (const path of listChatSessions(opts.root)) {
      let st;
      try {
        st = statSync(path);
      } catch {
        continue;
      }
      const cursorKey = `${VSCODE_SOURCE_ID}:${path}`;
      const stamp = `${st.size}:${st.mtimeMs}`;
      const seen = store.getCursor(cursorKey);
      if (seen === stamp) continue;
      if (seen === null && st.mtimeMs < opts.windowStart) {
        store.setCursor(cursorKey, stamp); // too old to matter
        continue;
      }
      const state = replayPatchLog(readFileSync(path, "utf8"));
      for (const r of extractRequests(state, basename(path, ".jsonl"))) {
        if (new Date(r.at).getTime() < opts.windowStart) continue;
        const usage = { input: r.input, output: r.output, cacheRead: 0, cache5m: 0, cache1h: 0 };
        const p = priceFor(r.model, opts.prices);
        store.upsertEvent(
          { sourceId: VSCODE_SOURCE_ID, providerId: "copilot", key: r.key, model: r.model, at: r.at, usage },
          p ? costMicros(usage, p) : 0,
        );
        written++;
      }
      store.setCursor(cursorKey, stamp);
    }
  });
  return written;
}
