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

| Key | Action                                                                        |
|-----|-------------------------------------------------------------------------------|
| `a` | add simulated spend                                                           |
| `s` | settings (enable alerts, alert interval, day start hour, reset today's spend) |
| `r` | refresh                                                                       |
| `q` | quit                                                                          |

Crossing several milestones in one go (e.g. $23 + $55 → $78) shows **one** combined alert.

## Days

A "day" runs from the configured start hour (default 04:00, set in the settings screen) to the same hour the next day,
so late-night sessions stay in one day. Changing the interval or start hour resets today's alert baseline without firing
an alert.

## Data

SQLite at `~/.config/beaware/beaware.db` (`$XDG_CONFIG_HOME` respected; override with `BEAWARE_DB`). Money is stored as
integer cents.

## Limitations

Manual spend only, daily period only (configurable start hour), in-TUI alerts only (no OS notifications), no budget.
