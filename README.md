# BeAware

Local-first spending alerts for AI coding agents. v0.1 does one thing: alert you each time today's spend crosses another
`$X` milestone. Spending is entered by hand for now; agent integrations come later.

## Run

```bash
bun install
bun run dev        # launch the TUI
bun test           # unit tests
bun run typecheck
```

`beaware --help` and `--version` are the only CLI flags. Everything else is configured in the TUI.

## TUI keys

| Key | Action                                                                       |
|-----|------------------------------------------------------------------------------|
| `a` | add simulated spend                                                          |
| `s` | settings (enable alerts, alert interval, day start hour, reset manual spend) |
| `r` | refresh                                                                      |
| `q` | quit                                                                         |

Crossing several milestones in one go (e.g. $23 + $55 → $78) shows **one** combined alert.

Each alert also sends an OS notification (with a sound on macOS) while the TUI is open. macOS uses the built-in
`osascript`, so notifications appear as coming from "Script Editor"; if none show up, allow it under System Settings →
Notifications → Script Editor. Linux needs `notify-send` (libnotify). Elsewhere, or if sending fails, only the in-TUI
banner is shown. Notifications follow the "Alerts" setting.

## Claude Code usage

While the TUI is open, BeAware reads `~/.claude/projects/**/*.jsonl` (or `$CLAUDE_CONFIG_DIR/projects`) every 10
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
only (configurable start hour), alerts and OS notifications only while the TUI is open (no background process), prices
edited in the file rather than the TUI, no budget.
