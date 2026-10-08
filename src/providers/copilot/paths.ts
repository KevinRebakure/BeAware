import { homedir } from "node:os";
import { join } from "node:path";

/** Copilot CLI's session database; COPILOT_HOME relocates its data directory. */
export function cliDbPath(): string {
  return join(process.env.COPILOT_HOME || join(homedir(), ".copilot"), "session-store.db");
}

/** VS Code's per-workspace storage; each `<hash>/chatSessions/*.jsonl` is one chat session. */
export function vscodeWorkspaceStorage(): string {
  return join(homedir(), "Library", "Application Support", "Code", "User", "workspaceStorage");
}
