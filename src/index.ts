#!/usr/bin/env bun
import { render } from "ink";
import { createElement } from "react";
import { Store } from "./db/store.ts";
import { App } from "./tui/App.tsx";

const VERSION = "0.1.0";
const arg = process.argv[2];

if (arg === "--version" || arg === "-v") {
  console.log(VERSION);
} else if (arg === "--help" || arg === "-h") {
  console.log(`BeAware v${VERSION} — spending alerts for AI coding agents

Usage: beaware

Launches the interactive TUI. All configuration happens inside it.

Keys:  a add spend · s settings · r refresh · q quit`);
} else if (arg) {
  console.error(`Unknown argument: ${arg}\nTry: beaware --help`);
  process.exit(1);
} else {
  const store = new Store();
  const app = render(createElement(App, { store }));
  await app.waitUntilExit();
  store.close();
}
