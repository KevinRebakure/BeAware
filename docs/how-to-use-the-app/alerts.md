# Alerts

**Rule:** alert when today's total crosses a multiple of the interval (default $25 → $25, $50, $75…).

- Several milestones in one go → **one** combined alert ($23 + $55 → $78 = 3 crossed)
- Each alert is delivered as:
  1. macOS notification with sound (from the daemon)
  2. Banner in the TUI, kept until you dismiss it
- Alerts off → nothing fires, and old milestones aren't replayed when you turn them on
- Changing settings never triggers an alert
- First launch imports the last 7 days **quietly**

## "Today"
Runs from the start hour (default 04:00) to the same hour next day, so late-night work stays in one day.

## Timing
Daemon checks every 10s, so an alert lands within ~10s of the usage being logged.
