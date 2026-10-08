# BeAware

Spending alerts for Claude Code and GitHub Copilot. Runs in the background and notifies you each time today's spend
crosses another `$X`
milestone.

> macOS only. Requires [Bun](https://bun.sh).

## Supported environments

Only usage written to local files on your Mac is counted; nothing is fetched from Anthropic or GitHub.

| Tool           | Environment                              | Supported | Cost shown | Source / why not                                                     |
|----------------|------------------------------------------|-----------|------------|----------------------------------------------------------------------|
| Claude Code    | Terminal (CLI)                           | ✅         | est.       | `~/.claude/projects/**/*.jsonl` (or `$CLAUDE_CONFIG_DIR/projects`)   |
| Claude Code    | IDE extensions (VS Code, JetBrains)      | ✅         | est.       | same session logs (not yet tested)                                   |
| Claude Code    | On the web (cloud sessions)              | ❌         | –          | runs remotely, no local logs                                         |
| Claude.ai      | Chat (web, desktop, mobile)              | ❌         | –          | not logged locally                                                   |
| Claude API     | Console / API usage                      | ❌         | –          | not logged locally                                                   |
| GitHub Copilot | Copilot CLI                              | ✅         | reported   | `~/.copilot/session-store.db` (or `$COPILOT_HOME`), usage table only |
| GitHub Copilot | Chat in VS Code                          | ✅         | est.       | VS Code `workspaceStorage/*/chatSessions/*.jsonl`                    |
| GitHub Copilot | VS Code Insiders and forks (e.g. Cursor) | ❌         | –          | location not read                                                    |
| GitHub Copilot | JetBrains plugin                         | ❌         | –          | no usage data found locally                                          |
| GitHub Copilot | Visual Studio, Xcode, Neovim             | ❌         | –          | not read                                                             |
| GitHub Copilot | github.com chat, cloud coding agent      | ❌         | –          | runs remotely                                                        |
| GitHub Copilot | Code completions, next-edit suggestions  | ❌         | –          | don't consume credits                                                |
| Others         | Codex, Cursor, Gemini CLI…               | ❌         | –          | not implemented yet                                                  |
| Platform       | Linux, Windows                           | ❌         | –          | macOS only                                                           |

**est.** is tokens × your price table; **reported** is the cost the tool recorded itself. Details:
[supported harnesses](docs/how-to-use-the-app/supported-harnesses.md)
and [cost calculation](docs/how-to-use-the-app/cost-calculation.md).

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
- [Privacy and data security](docs/how-to-use-the-app/privacy-and-data-security.md): what is read, what is stored, no
  network
- [Developer](docs/developer/README.md): stack, architecture, flows
