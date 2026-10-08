import { expect, test } from "bun:test";
import { summarize } from "../src/providers/breakdown.ts";

const M = 1_000_000; // $1 in micros

test("groups sources under providers with shares that add up to 100", () => {
  const out = summarize([
    { providerId: "claude-code", sourceId: "claude-code", micros: 6 * M },
    { providerId: "copilot", sourceId: "copilot-cli", micros: 3 * M },
    { providerId: "copilot", sourceId: "copilot-vscode", micros: 1 * M },
  ]);
  expect(out.map((p) => [p.label, p.cents, p.percent])).toEqual([
    ["Claude Code", 600, 60],
    ["GitHub Copilot", 400, 40],
  ]);
  expect(out[1]!.sources).toEqual([
    { label: "Copilot CLI", tag: "reported", cents: 300 },
    { label: "VS Code Chat", tag: "est.", cents: 100 },
  ]);
  expect(out[0]!.sources).toEqual([{ label: "Claude Code", tag: "est.", cents: 600 }]);
});

test("percentages sum to exactly 100 even when thirds don't divide evenly", () => {
  const out = summarize([
    { providerId: "claude-code", sourceId: "claude-code", micros: M },
    { providerId: "copilot", sourceId: "copilot-cli", micros: M },
    { providerId: "manual", sourceId: "manual", micros: M },
  ]);
  expect(out.reduce((s, p) => s + p.percent, 0)).toBe(100);
  expect(out.find((p) => p.label === "Manual")!.sources[0]!.tag).toBe("entered");
});

test("no spend, no rows; providers without spend are omitted", () => {
  expect(summarize([])).toEqual([]);
  expect(summarize([{ providerId: "copilot", sourceId: "copilot-cli", micros: M }]).map((p) => p.label)).toEqual(["GitHub Copilot"]);
});
