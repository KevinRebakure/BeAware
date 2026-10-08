# BeAware

Local-first spending alerts for AI coding agents. v0.1 does one thing: alert you each time today's spend crosses another
`$X` milestone. Spending is entered by hand for now; agent integrations come later.

## Install (macOS, runs in the background)

```bash
bun install
bun run build              # -> dist/beaware (single self-contained binary)
./dist/beaware install     # copies to ~/.local/bin/beaware and registers a LaunchAgent
```

The daemon (`beaware daemon`) starts at login, restarts if it crashes, syncs Claude Code usage every 10 seconds and sends
the OS notifications. Run `beaware` in any terminal to open the dashboard and change settings; changes reach the daemon
within ~10s. After changing the code, run `bun run build && ./dist/beaware install` again (idempotent).
Make sure `~/.local/bin` is on your `PATH`.

| Command             | What it does                                         |
|---------------------|------------------------------------------------------|
| `beaware`           | open the TUI                                         |
| `beaware status`    | daemon running? last sync, today's total             |
| `beaware logs`      | follow `~/Library/Logs/beaware/daemon.log`           |
| `beaware uninstall` | stop the daemon and remove the LaunchAgent (data kept) |

Docs: [docs/](docs/README.md). Development: `bun run dev` (TUI only, no daemon), `bun test`, `bun run typecheck`.

## TUI keys

| Key | Action                                                                       |
|-----|------------------------------------------------------------------------------|
| `a` | add simulated spend                                                          |
| `s` | settings (enable alerts, alert interval, day start hour, reset manual spend) |
| `r` | refresh                                                                      |
| `d` | restart the daemon                                                           |
| `i` | install the daemon (compiled binary only)                                    |
| `q` | quit                                                                         |

Crossing several milestones in one go (e.g. $23 + $55 → $78) shows **one** combined alert.

Each alert is sent by the daemon as an OS notification (with a sound on macOS) and also shown as a banner in the TUI until you dismiss it. macOS uses the built-in
`osascript`, so notifications appear as coming from "Script Editor"; if none show up, allow it under System Settings →
Notifications → Script Editor. Linux needs `notify-send` (libnotify). Elsewhere, or if sending fails, only the in-TUI
banner is shown. Notifications follow the "Alerts" setting.

## Claude Code usage

The daemon reads `~/.claude/projects/**/*.jsonl` (or `$CLAUDE_CONFIG_DIR/projects`) every 10
seconds. That covers all projects and subagents. The logs hold token counts, not dollars, so cost is **estimated at API
rates** and the total is labeled "est.".

- The first launch imports the last 7 days and is quiet: usage that already exists never triggers an alert.
- Prices live in
  `~/.config/beaware/prices.json` ($ per million tokens). The file is created with defaults on first run and re-read whenever it changes; stored usage is repriced, and if that pushes today past a milestone you get the normal alert. Models missing from the file count as $
  0 and show a warning.
- Settings → "Reset manual spend" deletes only what you added with `a` (handy for testing alerts). Usage read from the
  Claude Code logs is never removed.

## Days

A "day" runs from the configured start hour (default 04:00, set in the settings screen) to the same hour the next day,
so late-night sessions stay in one day. Changing the interval or start hour resets today's alert baseline without firing
an alert.

## Data

SQLite at `~/.config/beaware/beaware.db` (`$XDG_CONFIG_HOME` respected; override with `BEAWARE_DB`). Money is stored as
integer cents.

## Limitations

Claude Code only (no other agents yet), estimated cost rather than your actual bill, no fast-mode pricing, daily period
only (configurable start hour), macOS only for the background service, prices
edited in the file rather than the TUI, no budget.
