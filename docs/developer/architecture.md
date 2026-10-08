# Architecture

One binary, three roles.

```mermaid
flowchart LR
    subgraph bin["beaware binary"]
        CLI["index.ts<br/>subcommands"]
        D["daemon.ts"]
        T["tui/ (Ink)"]
        L["launchd.ts"]
    end
    CLI --> D & T & L
    L -- " plist + launchctl " --> LD[(launchd)]
    LD -- " runs at login / KeepAlive " --> D
    D --> S["service.ts<br/>sync + alerts"]
    S --> I["ingest/claude.ts"]
    S --> C["core/<br/>alerts, pricing, day, money"]
    I -- " reads " --> J[("~/.claude/projects<br/>*.jsonl")]
    S & T --> ST["db/store.ts"]
    ST --> DB[("beaware.db<br/>SQLite WAL")]
    D --> N["notify.ts"] --> OS["macOS<br/>notification"]
    S -- " reads " --> P[("prices.json")]
```

## Modules

| Path                   | Role                                                        |
|------------------------|-------------------------------------------------------------|
| `src/index.ts`         | CLI entry, dispatches subcommands                           |
| `src/daemon.ts`        | tick loop, heartbeat, single-instance guard                 |
| `src/service.ts`       | `createSyncer`, `checkAlerts`, `updateSettings` (use-cases) |
| `src/ingest/claude.ts` | incremental JSONL reader                                    |
| `src/core/*`           | pure logic: milestones, pricing, day buckets, money         |
| `src/db/store.ts` | facade: one entry point, delegates to repositories |
| `src/db/config.ts`, `schema.ts` | open DB (pragmas, WAL), create tables |
| `src/db/repositories/*` | one file per entity; all SQL lives here |
| `src/notify.ts`        | OS notification command                                     |
| `src/launchd.ts`       | install/uninstall, plist generation                         |
| `src/tui/*`            | App, Dashboard, Settings, AddSpend                          |

## Boundaries

- `core/` is pure (no IO) → easy to test
- Only `src/db/` runs SQL; callers use `Store`
- TUI and daemon never talk directly; they share the DB (+ heartbeat)

## Process view

```mermaid
flowchart TB
    subgraph bg["Background (always on)"]
        P1["beaware daemon"]
    end
    subgraph fg["On demand"]
        P2["beaware (TUI)"]
    end
    P1 <-- " SQLite WAL " --> DB[(beaware.db)]
    P2 <-- " SQLite WAL " --> DB
```
