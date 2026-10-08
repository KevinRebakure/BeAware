# BeAware

Spending alerts for Claude Code. Runs in the background and notifies you each time today's spend crosses another `$X`
milestone.

> macOS only. Requires [Bun](https://bun.sh).

## Quick start

```bash
bun install
bun run build            # -> dist/beaware
./dist/beaware install   # runs in the background from now on (starts at login)
beaware                  # open the dashboard / settings
```

Make sure `~/.local/bin` is on your `PATH`.

## Commands

| Command             | Does                                  |
|---------------------|---------------------------------------|
| `beaware`           | open the dashboard and settings (TUI) |
| `beaware status`    | is the daemon running?                |
| `beaware logs`      | follow the daemon log                 |
| `beaware uninstall` | stop and remove the background daemon |

Update: `bun run build && ./dist/beaware install`

## Contributing

```bash
bun run dev         # TUI only (no daemon)
bun test
bun run typecheck
```

## Docs

- [How to use the app](docs/how-to-use-the-app/README.md): install, configure, alerts, costs
- [Developer](docs/developer/README.md): stack, architecture, flows
