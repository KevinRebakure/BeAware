# Data model

SQLite at `~/.config/beaware/beaware.db`. Schema created idempotently in `Store`'s constructor.

| Table              | Purpose                                                                                             |
|--------------------|-----------------------------------------------------------------------------------------------------|
| `spend_events`     | one row per Claude response (`source=claude-code`, unique `ext_key`) or manual add; `amount_micros` |
| `settings`         | key/value: `alert_enabled`, `alert_interval_cents`, `day_start_hour`, `synced_once`                 |
| `alert_state`      | per-day high-water milestone (`day`, `last_milestone_cents`)                                        |
| `ingest_files`     | byte offset per JSONL file (incremental reads)                                                      |
| `daemon_heartbeat` | single row: pid, time, total, warnings                                                              |
| `last_alert`       | single row: latest alert + `dismissed` flag                                                         |

## ER diagram

No foreign keys are declared; relationships are logical (derived at query time).

```mermaid
erDiagram
  spend_events {
    INTEGER id PK
    TEXT source "claude-code | manual"
    TEXT ext_key UK "messageId:requestId (null for manual)"
    TEXT model
    INTEGER input_tokens
    INTEGER output_tokens
    INTEGER cache_read_tokens
    INTEGER cache_5m_tokens
    INTEGER cache_1h_tokens
    INTEGER amount_micros
    TEXT created_at "ISO time, indexed"
  }
  settings {
    TEXT key PK
    TEXT value
  }
  alert_state {
    TEXT day PK "YYYY-MM-DD"
    INTEGER last_milestone_cents
  }
  ingest_files {
    TEXT path PK "JSONL file"
    INTEGER offset "bytes read"
  }
  daemon_heartbeat {
    INTEGER id PK "always 1"
    INTEGER pid
    TEXT at
    INTEGER total_cents
    TEXT unknown_models "JSON array"
    TEXT prices_error
  }
  last_alert {
    INTEGER id PK "always 1"
    TEXT at
    INTEGER total_cents
    INTEGER crossed
    INTEGER reached_cents
    INTEGER next_cents
    INTEGER dismissed
  }

  ingest_files ||--o{ spend_events : "imports (by file offset)"
  settings ||--o{ alert_state : "interval + day start define milestones/day"
  spend_events }o--|| alert_state : "summed per day → compared to milestone"
  alert_state ||--o| last_alert : "crossing produces"
  last_alert }o--|| daemon_heartbeat : "written by same daemon tick"
```

## Conventions

- Money: integer **micro-dollars** (1¢ = 10,000); totals floor to cents
- `ext_key = messageId:requestId`; last log line for a message wins
- Day = local time from `dayStartHour`, key `YYYY-MM-DD`
- Other files: `prices.json` (same dir), log `~/Library/Logs/beaware/daemon.log`
