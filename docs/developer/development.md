# Development workflow

```bash
bun install
bun run dev         # TUI only (no daemon, no live data)
bun test            # unit tests
bun run typecheck
bun run build       # dist/beaware
```

## Try the daemon without touching your real setup
```bash
export BEAWARE_DB=/tmp/bx/b.db BEAWARE_LOG=/tmp/bx/d.log
./dist/beaware daemon        # foreground
./dist/beaware status        # other terminal, same env
```

## Tests
`tests/` mirrors `src/`. Pure logic in `core/` + injected clock/`Store(":memory:")` keep tests fast. Daemon tested via `tick(store, fakeSync, fakeNotify)`.

## Adding a harness
1. `src/ingest/<harness>.ts`: parse logs → `upsert…` events (stable `ext_key`)
2. Call it from `createSyncer` in `src/service.ts`
3. Add prices / source label; extend repricing if token-based
4. Update [supported harnesses](../how-to-use-the-app/supported-harnesses.md)

## Adding a platform
Implement the `launchd.ts` surface (`install`, `uninstall`, `restart`, `isLoaded`) for systemd, and add a notifier in `notify.ts`.
