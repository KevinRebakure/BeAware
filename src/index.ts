#!/usr/bin/env bun
import { render } from "ink";
import { createElement } from "react";
import { runDaemon } from "./daemon.ts";
import { formatAgo } from "./core/ago.ts";
import { formatCents } from "./core/money.ts";
import { logPath } from "./db/paths.ts";
import { isAlive } from "./db/repositories/heartbeat.ts";
import { Store } from "./db/store.ts";
import { install, isLoaded, uninstall } from "./launchd.ts";
import { VERSION } from "./version.ts";
import { App } from "./tui/App.tsx";

const arg = process.argv[2];

const HOME_AND_ERASE = "\x1b[H\x1b[J"; // cursor to top-left, erase to the end of the screen

const HELP = `BeAware v${VERSION} — spending alerts for AI coding agents

Usage: beaware [command]

  (none)      open the TUI (dashboard + settings)
  install     copy this binary to ~/.local/bin and run the daemon at login (macOS)
  uninstall   stop the daemon and remove the LaunchAgent (data is kept)
  status      show whether the daemon is running
  logs        follow the daemon log
  daemon      run the watcher in the foreground (used by launchd)

TUI keys:  a add spend · s settings · r refresh · d restart daemon · i install daemon · q quit`;

function fail(e: unknown): never {
  console.error((e as Error).message ?? e);
  process.exit(1);
}

if (arg === "--version" || arg === "-v") {
  console.log(VERSION);
} else if (arg === "--help" || arg === "-h") {
  console.log(HELP);
} else if (arg === "install") {
  try {
    install().forEach((l) => console.log(l));
  } catch (e) {
    fail(e);
  }
} else if (arg === "uninstall") {
  uninstall().forEach((l) => console.log(l));
} else if (arg === "status") {
  const store = new Store();
  const hb = store.getHeartbeat();
  const alive = isAlive(hb);
  console.log(`agent:   ${isLoaded() ? "loaded" : "not loaded"}`);
  console.log(`daemon:  ${alive ? `running (pid ${hb!.pid})` : "not running"}`);
  if (hb) {
    console.log(`last sync: ${formatAgo(hb.at)}`);
    console.log(`today:   ${formatCents(store.total())} est.`);
  }
  store.close();
  process.exit(alive ? 0 : 1);
} else if (arg === "logs") {
  const p = Bun.spawn(["tail", "-n", "50", "-f", logPath()], { stdout: "inherit", stderr: "inherit" });
  process.exit(await p.exited);
} else if (arg === "daemon") {
  const store = new Store();
  await runDaemon(store);
  store.close();
} else if (arg) {
  console.error(`Unknown argument: ${arg}\nTry: beaware --help`);
  process.exit(1);
} else {
  const store = new Store();
  // The alternate screen takes over the whole terminal and restores it on exit, like vim or htop.
  const app = render(createElement(App, { store }), { alternateScreen: true });
  // Ink wipes the screen only when the window gets narrower; otherwise it erases "the previous frame" relative to the
  // cursor. Terminals that reflow text on resize move rows out from under that, leaving stale rows above the new
  // frame. So on any resize, clear from the top-left and let the next render repaint everything.
  process.stdout.on("resize", () => {
    process.stdout.write(HOME_AND_ERASE);
    app.clear();
  });
  await app.waitUntilExit();
  store.close();
}
