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
    Sy->>P: sync(ctx) (new data only)
    P->>St: upsertEvent, setCursor
  end
  Sy->>St: prune() (retention: oldest days past 7 → keep last 3)
  Sy->>St: total(), settings, lastAlerted
  Sy-->>D: {total, alert?, warnings}
  alt alert
    D->>St: saveLastAlert
    D->>N: OS notification
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
  T["every 2s"] --> R["read Store"]
  R --> UI["total · heartbeat · pending alert"]
  K["keys"] --> W["Store writes:<br/>settings, manual spend,<br/>dismiss alert"]
  W -. "picked up next daemon tick" .-> D["daemon"]
```
Alive = heartbeat younger than 30s.

## 4. Settings change
TUI → `updateSettings` → `Store.saveSettings`. If interval or day-start changed → rebaseline (no alert). Daemon reads settings fresh each tick (no cache).

## 5. Install
```mermaid
flowchart LR
  A["beaware install"] --> B["copy binary → ~/.local/bin"]
  B --> C["write plist"]
  C --> D["launchctl bootout (ignore)"]
  D --> E["launchctl bootstrap gui/UID"]
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
    DB[("session-store.db<br/>read-only")] -->|"WHERE id > cursor<br/>explicit columns"| E1["upsertEvent<br/>cost = reported nano-AIU"]
  end
  subgraph vs["copilot-vscode"]
    F[("chatSessions/*.jsonl")] -->|"size:mtime changed?"| R["replay patch log"] --> X["extract ids + tokens"] --> E2["upsertEvent<br/>cost = tokens × copilot/model price"]
  end
```
The two sources run independently; one failing doesn't hide the other.
