# Supported harnesses

| Harness                             | Status      | Source                                                                         |
|-------------------------------------|-------------|--------------------------------------------------------------------------------|
| Claude Code                         | ✅ supported | `~/.claude/projects/**/*.jsonl` (or `$CLAUDE_CONFIG_DIR/projects`)             |
| GitHub Copilot CLI                  | ✅ supported | `~/.copilot/session-store.db` (or `$COPILOT_HOME`), usage table only           |
| GitHub Copilot Chat in VS Code      | ✅ supported | `~/Library/Application Support/Code/User/workspaceStorage/*/chatSessions/*.jsonl` |
| Others (Codex, Cursor, Gemini CLI…) | ❌ not yet   | –                                                                              |

Covers all Claude Code projects and subagents. Claude.ai chat and the API are **not** tracked. For Copilot, code
completions and the JetBrains plugin are **not** tracked, and nothing is fetched from GitHub: only local files are read
([privacy](privacy-and-data-security.md)).

Each source has an accuracy tag on the dashboard: **est.** (tokens × your prices), **reported** (a cost the tool recorded
itself) or **entered** (manual). See [cost calculation](cost-calculation.md).

Manual spend (`a`) counts too, for testing.

## Copilot CLI and VS Code overlap

If you use Copilot agent sessions from VS Code, the same work may appear in both the CLI database and the VS Code chat
logs. The two sources use unrelated session ids, so BeAware cannot tell they are the same work and **may count it twice**.
The dashboard shows them as separate lines so you can spot it.
