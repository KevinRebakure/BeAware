# Update

```bash
git pull
bun install
bun run build
./dist/beaware install
```

`install` is idempotent: it replaces the binary and reloads the daemon. Data is kept.

The database is migrated automatically the first time the new version opens it (existing Claude Code history is kept).
**Run `install` before opening the new dashboard**: an old daemon still running against a migrated database can't read it
and logs `tick failed` until it's replaced. After a migration you can't go back to an older version without deleting
`~/.config/beaware/beaware.db`.

The first time the daemon runs after this update it also applies the [retention rule](privacy-and-data-security.md#how-long-data-is-kept): anything older than
the last 3 days is deleted from the database. Today's total and alerts are unaffected.
