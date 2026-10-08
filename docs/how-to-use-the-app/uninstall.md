# Uninstall

```bash
beaware uninstall
```

Stops the daemon and removes the LaunchAgent.

**Kept** (delete manually for a full wipe):
- `~/.local/bin/beaware`
- `~/.config/beaware/` (database, `prices.json`)
- `~/Library/Logs/beaware/`

BeAware only ever *reads* other tools' data (Claude Code logs, Copilot files), so uninstalling never touches them. To remove
everything BeAware stored, see [privacy and data security](privacy-and-data-security.md#deleting-your-data).
