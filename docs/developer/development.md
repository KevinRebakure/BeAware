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
`tests/` mirrors `src/` (provider tests under `tests/providers/`). Always pass `isolatedRoots(dir)` (from `tests/helpers.ts`) to `createSyncer`/`provider.sync`: without it a test reads your real `~/.claude` and `~/.copilot`. Pure logic in `core/` + injected clock/`Store(":memory:")` keep tests fast. Daemon tested via `tick(store, fakeSync, fakeNotify)`.

## Adding a provider
1. Create `src/providers/<id>/` with, as needed: `paths.ts` (where data lives, env override), `parse.ts` or `<source>.ts` (incremental ingesters), `prices.ts` (default prices, if token-priced), and `index.ts` exporting a `Provider` (`id`, `label`, `sources`, `defaultPrices`, `sync(ctx)`)
2. Write through `Store` only: `upsertEvent` (stable raw `key`; the source id is prefixed for you), `getCursor`/`setCursor` for progress
3. Declare each source's accuracy (`estimated` / `reported`) and whether it is `tokenPriced`; token-priced sources are repriced and checked for unknown models automatically
4. Add one line to `PROVIDERS` in `src/providers/registry.ts`
5. Follow the [privacy rules](privacy-rules.md) and add the sentinel fixture to `tests/privacy.test.ts`
6. Tests go in `tests/providers/<id>.test.ts`; use `isolatedRoots()` so they never read the real machine
7. Update [supported harnesses](../how-to-use-the-app/supported-harnesses.md), [cost calculation](../how-to-use-the-app/cost-calculation.md) and the privacy doc

## Adding a platform
Implement the `launchd.ts` surface (`install`, `uninstall`, `restart`, `isLoaded`) for systemd, and add a notifier in `notify.ts`.
