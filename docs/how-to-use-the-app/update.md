# Update

```bash
git pull
bun install
bun run build
./dist/beaware install
```

`install` is idempotent: it replaces the binary and reloads the daemon. Data is kept; new DB tables are added automatically.
