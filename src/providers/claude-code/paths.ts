import { homedir } from "node:os";
import { join } from "node:path";

export function claudeRoot(): string {
  const base = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
  return join(base, "projects");
}
