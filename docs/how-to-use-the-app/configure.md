# Configure

Open `beaware` → press `s`. Changes reach the daemon within ~10s.

| Setting            | Default | Notes                                                    |
|--------------------|---------|----------------------------------------------------------|
| Alerts enabled     | on      | off = no notifications, nothing replayed when re-enabled |
| Alert every        | $25     | milestone size                                           |
| Day starts at      | 04:00   | when "today" resets                                      |
| Reset manual spend | –       | removes only spend added with `a`                        |

Changing *Alert every* or *Day starts at* resets today's baseline silently: no alert fires from editing.

## Prices

Edit `~/.config/beaware/prices.json` ($ per million tokens). Picked up automatically; stored usage is repriced.

## Environment overrides

| Var                 | Purpose                     |
|---------------------|-----------------------------|
| `BEAWARE_DB`        | database path               |
| `BEAWARE_PRICES`    | prices file path            |
| `BEAWARE_LOG`       | daemon log path             |
| `CLAUDE_CONFIG_DIR` | where Claude Code logs live |
| `XDG_CONFIG_HOME`   | config base dir             |

The daemon captures these at `install` time; re-run `install` after changing them.
