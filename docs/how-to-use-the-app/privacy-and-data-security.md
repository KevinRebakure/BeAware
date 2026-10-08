# Privacy and data security

BeAware reads usage numbers from your AI tools' local files, keeps a small database on your Mac, and shows a notification
when a spending milestone is crossed. **Nothing leaves your machine.**

## What is read

Only local files, and only to count usage. They are opened read-only; BeAware never modifies them.

| Tool               | Location                                                                          | What is taken from it                                          |
|--------------------|-----------------------------------------------------------------------------------|----------------------------------------------------------------|
| Claude Code        | `~/.claude/projects/**/*.jsonl` (`$CLAUDE_CONFIG_DIR`)                            | model, token counts, timestamp, message and request ids        |
| Copilot CLI        | `~/.copilot/session-store.db` (`$COPILOT_HOME`), `assistant_usage_events` table   | model, token counts, cost, timestamp, session and row ids      |
| Copilot in VS Code | `~/Library/Application Support/Code/User/workspaceStorage/*/chatSessions/*.jsonl` | model, input/output token counts, timestamp, session/request ids |

## What is never read or stored

These files also contain your **prompts, the tools' responses, file contents and tool output**. BeAware does not copy any of
it. The Copilot CLI database is queried with one fixed column list, and the conversation tables in the same file
(`turns`, `checkpoints`, the search index…) are never queried. The Claude and VS Code logs are parsed for numeric fields and
ids only. A test fails the build if text from any supported tool ever reaches BeAware's database
([contributor rules](../developer/privacy-rules.md)).

BeAware does not read credentials either: for example `~/.config/github-copilot/` (OAuth tokens) is not touched.

## What is stored

In `~/.config/beaware/beaware.db` (SQLite):

- **Usage rows:** tool, model name, token counts, dollar amount, timestamp, and an id used to avoid counting a response twice
- **Progress markers:** how far each file/database has been read. For log files this is the file's **path**, so the database
  contains the paths of your project directories (for example `…/.claude/projects/-Users-you-work-client-x/…`). It is
  therefore worth treating `beaware.db` as private
- **Settings and alert state:** your interval, day start, last alert, daemon heartbeat
- `prices.json` (your price table) sits next to it, and the daemon log is at `~/Library/Logs/beaware/daemon.log`

The daemon log records start/stop, alerts and error messages. It never records usage payloads or conversation text.

## How long data is kept

BeAware only ever shows **today**, so it keeps just the last few days. Once the stored data covers 7 days (counting from
the day start, default 04:00), everything older than the **last 3 days** (today and the 2 before it) is deleted, along with
the per-day alert state. Usage older than that is also never imported. In practice the database holds between 3 and 7 days
of usage rows and stays small instead of growing forever.

Deleted rows are gone for good: BeAware keeps no backup. A line like `pruned 1369 events older than the last 3 days` is written
to the daemon log whenever this happens. The progress markers (log file paths) are small and are not pruned.

## Network

BeAware makes **no network requests**: no telemetry, no update checks, no calls to Anthropic or GitHub. It needs no API
tokens or accounts. The only thing it launches is the macOS notification helper (`osascript`), with the alert text passed as
plain arguments.

## The background daemon

`beaware install` registers a per-user LaunchAgent: it runs as **you**, only while you're logged in, with your normal file
permissions. It needs no admin rights. It can read what you can read, which is why it is limited to the paths above.

## Deleting your data

```bash
beaware uninstall                 # stops the daemon, removes the LaunchAgent
rm -rf ~/.config/beaware          # database and prices.json
rm -rf ~/Library/Logs/beaware     # daemon log
rm ~/.local/bin/beaware           # the binary
```

Deleting the database is safe: usage from the last 3 days is re-imported the next time the daemon starts (quietly, no alerts).
Your other tools' data is never changed or deleted by BeAware.
