import { homedir } from "node:os";
import { dirname, join } from "node:path";

export function dbPath(): string {
  if (process.env.BEAWARE_DB) return process.env.BEAWARE_DB;
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "beaware", "beaware.db");
}

export function pricesPath(): string {
  return process.env.BEAWARE_PRICES || join(dirname(dbPath()), "prices.json");
}
