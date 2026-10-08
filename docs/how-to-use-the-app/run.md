# Run & open

The daemon runs by itself: starts at login, restarts if it crashes. Nothing to launch.

| Command          | Does                                     |
|------------------|------------------------------------------|
| `beaware`        | open the dashboard / settings (TUI)      |
| `beaware status` | daemon running? last sync, today's total |
| `beaware logs`   | follow the daemon log                    |

Closing the TUI does **not** stop alerts.

## TUI keys

| Key | Action                                |
|-----|---------------------------------------|
| `a` | add simulated spend (testing alerts)  |
| `s` | settings                              |
| `r` | refresh                               |
| `d` | restart daemon                        |
| `i` | install daemon (compiled binary only) |
| `q` | quit TUI                              |

Any key dismisses an alert banner.
