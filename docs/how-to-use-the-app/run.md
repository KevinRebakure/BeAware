# Run & open

The daemon runs by itself: starts at login, restarts if it crashes. Nothing to launch.

| Command          | Does                                     |
|------------------|------------------------------------------|
| `beaware`        | open the dashboard / settings (TUI)      |
| `beaware status` | daemon running? last sync, today's total |
| `beaware logs`   | follow the daemon log                    |

`beaware` takes over the whole terminal (like vim or htop) and puts your screen back when you quit. The layout grows with
the window but never gets wider than 56 columns, and is pinned to the top-left corner. It follows if you resize. Closing the TUI does **not** stop alerts.

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
