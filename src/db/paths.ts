import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** Env vars that change where the app reads/writes; the launchd daemon must receive the same ones. */
export const PATH_ENV_VARS = ["BEAWARE_DB", "BEAWARE_PRICES", "BEAWARE_LOG", "CLAUDE_CONFIG_DIR", "XDG_CONFIG_HOME"] as const;

export function dbPath(): string {
  if (process.env.BEAWARE_DB) return process.env.BEAWARE_DB;
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "beaware", "beaware.db");
}

export function pricesPath(): string {
  return process.env.BEAWARE_PRICES || join(dirname(dbPath()), "prices.json");
}

export function logPath(): string {
  return process.env.BEAWARE_LOG || join(homedir(), "Library", "Logs", "beaware", "daemon.log");
}
