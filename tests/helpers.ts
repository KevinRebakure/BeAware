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
