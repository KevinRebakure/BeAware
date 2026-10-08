import { homedir } from "node:os";
import { join } from "node:path";

/** Copilot CLI's data directory (COPILOT_HOME relocates it). */
export function copilotHome(): string {
  return process.env.COPILOT_HOME || join(homedir(), ".copilot");
}

export function cliDbPath(home = copilotHome()): string {
  return join(home, "session-store.db");
}

/** VS Code's per-workspace storage; each `<hash>/chatSessions/*.jsonl` is one chat session. */
export function vscodeWorkspaceStorage(): string {
  return join(homedir(), "Library", "Application Support", "Code", "User", "workspaceStorage");
}
