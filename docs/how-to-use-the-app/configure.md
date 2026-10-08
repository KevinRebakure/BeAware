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

When BeAware gains support for a tool, that tool's default prices are added to your existing file the first time it runs.
Entries already in the file are never changed or re-added. Copilot CLI costs are reported by Copilot and are not repriced.

## Data retention

Not a setting. BeAware keeps the last 3 days of usage and deletes older rows once 7 days have accumulated
([details](privacy-and-data-security.md#how-long-data-is-kept)). The two numbers are constants in `src/db/retention.ts`.

## Environment overrides

| Var                 | Purpose                      |
|---------------------|------------------------------|
| `BEAWARE_DB`        | database path                |
| `BEAWARE_PRICES`    | prices file path             |
| `BEAWARE_LOG`       | daemon log path              |
| `CLAUDE_CONFIG_DIR` | where Claude Code logs live  |
| `COPILOT_HOME`      | where Copilot CLI data lives |
| `XDG_CONFIG_HOME`   | config base dir              |

The daemon captures these at `install` time; re-run `install` after changing them.
