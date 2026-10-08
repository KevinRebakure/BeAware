import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dirs: string[] = [];

/** A fresh temp directory; remove them all with `afterEach(cleanupTmpDirs)`. */
export function tmpDir(prefix = "beaware-"): string {
  const d = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(d);
  return d;
}

export function cleanupTmpDirs() {
  dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true }));
}

/** Roots that point every provider at `dir` (empty unless a test fills it), so tests never read the real machine. */
export function isolatedRoots(dir: string, overrides: Record<string, string> = {}): Record<string, string> {
  return {
    "claude-code": join(dir, "no-claude"),
    "copilot-cli": join(dir, "no-copilot", "session-store.db"),
    "copilot-vscode": join(dir, "no-vscode"),
    ...overrides,
  };
}
