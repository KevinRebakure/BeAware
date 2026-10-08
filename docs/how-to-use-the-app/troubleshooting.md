# Troubleshooting

| Symptom                            | Fix                                                         |
|------------------------------------|-------------------------------------------------------------|
| TUI says "daemon not running"      | press `d`, or `beaware install`                             |
| `beaware: command not found`       | add `~/.local/bin` to `PATH`                                |
| No notifications                   | System Settings → Notifications → **Script Editor** → allow |
| `status` shows old "last sync"     | `beaware logs`; then `d` to restart                         |
| Warning: unpriced model            | add it to `prices.json` (counted as $0 until then)          |
| Warning: prices.json invalid       | fix the JSON; defaults used meanwhile                       |
| `install` fails from `bun run dev` | run it from the compiled `dist/beaware`                     |
