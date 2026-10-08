# Supported harnesses

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

Covers all Claude Code projects and subagents. Nothing is fetched from Anthropic or GitHub: only local files are read
([privacy](privacy-and-data-security.md)).

Each source has an accuracy tag on the dashboard: **est.** (tokens × your prices), **reported** (a cost the tool recorded
itself) or **entered** (manual). See [cost calculation](cost-calculation.md).

Manual spend (`a`) counts too, for testing.

## Copilot CLI and VS Code overlap

If you use Copilot agent sessions from VS Code, the same work may appear in both the CLI database and the VS Code chat
logs. The two sources use unrelated session ids, so BeAware cannot tell they are the same work and **may count it twice**.
The dashboard shows them as separate lines so you can spot it.
