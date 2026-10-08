# Install

**Requires:** macOS (other platforms are [not supported](platform-support.md)), [Bun](https://bun.sh) (build time only).

```bash
git clone <repo> && cd BeAware
bun install
bun run build            # -> dist/beaware (self-contained binary)
./dist/beaware install   # one-time setup
```

`install` does three things:
1. Copies the binary to `~/.local/bin/beaware`
2. Writes `~/Library/LaunchAgents/com.beaware.daemon.plist`
3. Starts the background daemon (and at every login)

**Check:** `beaware status` → `daemon: running`.

> Make sure `~/.local/bin` is on your `PATH`. `install` warns if it isn't.

You can delete the repo afterwards; the daemon doesn't need it.
