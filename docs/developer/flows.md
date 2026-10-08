# Flows

## 1. Daemon tick (every 10s)
```mermaid
sequenceDiagram
  participant D as daemon tick()
  participant Sy as syncer
  participant P as providers (registry)
  participant St as Store
  participant N as notify
  D->>Sy: sync()
  Sy->>Sy: reload prices.json if changed → reprice token-priced sources
  loop each provider (a failure is logged and skipped)
    Sy->>P: sync(ctx) (new data only, nothing before keepFrom)
    P->>St: upsertEvent, setCursor
  end
  Sy->>St: prune() (data spans 7 days → keep the last 3)
  alt a provider's first sync
    Sy->>St: rebaseline, markSynced (quiet, no alert)
  else
    Sy->>St: total(), settings, lastAlerted → checkAlerts
  end
  Sy-->>D: {total, alert?, warnings, pruned}
  alt alert
    D->>St: saveLastAlert
    D->>N: OS notification
  end
  opt pruned > 0
    D->>D: log "pruned N events older than the last 3 days"
  end
  D->>St: writeHeartbeat
```

## 2. Alert decision (`core/alerts.ts`)
```mermaid
flowchart LR
  A["total today"] --> E{"floor(total/interval)<br/>> lastAlerted?"}
  E -- no --> X["nothing"]
  E -- yes --> U["advance high-water mark"]
  U --> En{"alerts enabled?"}
  En -- yes --> F["one combined alert"]
  En -- no --> X
```
High-water mark advances even when disabled → no replay.

## 3. TUI
```mermaid
flowchart LR
  subgraph screen["Screen: alternate screen, top-left, at most 56 columns"]
    T["every 2s"] --> R["read Store"]
    R --> UI["total · per-provider breakdown (summarize)<br/>heartbeat · pending alert"]
  end
  K["keys"] --> W["Store writes:<br/>settings, manual spend,<br/>dismiss alert"]
  W -. "picked up next daemon tick" .-> D["daemon"]
  Z["terminal resized, or startup"] --> C["clear from top-left, repaint"]
  C --> screen
```
Alive = heartbeat younger than 30s. `Screen` is the only reader of terminal size; it caps the width and `Panel` derives bar widths from it. Startup also repaints from the top-left because entering the alternate screen leaves the cursor where the shell prompt was.

## 4. Settings change
TUI → `updateSettings` → `Store.saveSettings`. If interval or day-start changed → rebaseline (no alert). Daemon reads settings fresh each tick (no cache).

## 5. Install
```mermaid
flowchart LR
  A["beaware install"] --> B["copy binary → ~/.local/bin"]
  B --> C["write plist"]
  C --> D["launchctl bootout (ignore)"]
  D --> E["launchctl bootstrap gui/UID"]
  E -- "fails with EIO while the old service is still being removed" --> G["retry every 250ms, up to ~5s"]
  G --> E
  E --> F["daemon starts; first sync is quiet"]
```

## 6. First sync
Per provider (`synced_once:<providerId>`): imports the last 3 days (the kept days), sets the baseline to the current milestone, fires nothing. A provider added later (e.g. Copilot after an update) gets its own quiet first sync, so its history can't cause an alert. Side effect: an alert that would have been raised by *another* provider in that same tick is absorbed into the new baseline.

## 7. Retention
```mermaid
flowchart LR
  T["each sync"] --> Q{"oldest row's app day<br/>≥ 6 days before today?<br/>(data spans 7 days)"}
  Q -- no --> X["nothing"]
  Q -- yes --> D["delete events and alert_state<br/>before start of (today − 2)<br/>→ keep today + 2 previous days"]
```
One boundary, `keepFrom(now, dayStartHour)` in `src/db/retention.ts`, is shared by pruning and ingestion (`windowStart`). Ingesters ignore anything before it, so a re-read log or a replayed chat session can't bring a deleted row back. Pruning is calendar-based and runs in one transaction; the daemon logs a line only when rows were deleted. The two numbers are constants (`PRUNE_AT_DAYS`, `KEEP_DAYS`), not settings.

## 8. Copilot sources
```mermaid
flowchart LR
  subgraph cli["copilot-cli"]
    DB[("session-store.db<br/>read-only")] -->|"WHERE id > cursor<br/>explicit columns"| K1{"before keepFrom?"}
    K1 -- no --> E1["upsertEvent<br/>cost = reported nano-AIU"]
    K1 -- yes --> S1["skip (cursor still advances)"]
  end
  subgraph vs["copilot-vscode"]
    F[("workspace/chatSessions/*.jsonl")] -->|"size:mtime changed?"| R["replay patch log"] --> X["extract ids + tokens<br/>(requests before keepFrom ignored)"] --> E2["upsertEvent<br/>cost = tokens × copilot/model price"]
  end
```
The two sources run independently; one failing doesn't hide the other.
