import type { AlertResult } from "./core/alerts.ts";
import { formatCents } from "./core/money.ts";

export function alertText(alert: AlertResult, totalCents: number): { title: string; body: string } {
  const noun = alert.crossed === 1 ? "milestone" : "milestones";
  return {
    title: `BeAware: spending milestone reached ${formatCents(totalCents)}`,
    body: `${alert.crossed} ${noun} crossed · next alert ${formatCents(alert.nextCents)}`,
  };
}

/** Command that shows an OS notification, or null on unsupported platforms. Text is passed as argv, never interpolated. */
export function notificationCommand(platform: string, title: string, body: string): string[] | null {
  if (platform === "darwin") {
    return [
      "osascript",
      "-e", "on run argv",
      "-e", 'display notification (item 1 of argv) with title (item 2 of argv) sound name "Glass"',
      "-e", "end run",
      body,
      title,
    ];
  }
  if (platform === "linux") return ["notify-send", "--app-name=BeAware", title, body];
  return null;
}

type Spawn = (cmd: string[], opts: { stdout: "ignore"; stderr: "ignore" }) => unknown;

/** Fire-and-forget OS notification. Failures (missing binary, blocked notifications) are ignored; the TUI banner is the fallback. */
export function notifyAlert(
  alert: AlertResult,
  totalCents: number,
  spawn: Spawn = Bun.spawn as Spawn,
  platform: string = process.platform,
) {
  try {
    const { title, body } = alertText(alert, totalCents);
    const cmd = notificationCommand(platform, title, body);
    if (cmd) spawn(cmd, { stdout: "ignore", stderr: "ignore" });
  } catch {
    // ignore
  }
}
