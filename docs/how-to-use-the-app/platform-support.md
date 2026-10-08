# Platform support

**BeAware supports macOS only.**

| Platform | Background daemon | Notifications | Status |
|---|---|---|---|
| macOS | ✅ launchd LaunchAgent | ✅ `osascript` | supported |
| Linux | ❌ | ❌ | not supported |
| Windows | ❌ | ❌ | not supported |

- `beaware install` exits with an error on non-macOS systems
- The TUI (`bun run dev`) may start elsewhere, but there is no background syncing or alerts without the daemon
- Why macOS only: the daemon is a launchd agent and alerts use `osascript`. Other platforms would need their own service manager (e.g. systemd) and notifier (see [Developer → Adding a platform](../developer/development.md))
