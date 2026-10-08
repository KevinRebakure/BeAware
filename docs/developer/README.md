# Developer docs

- [Tech stack](tech-stack.md)
- [Architecture](architecture.md): components + diagrams
- [Flows](flows.md): sync, alerts, settings, install
- [Data model](data-model.md)
- [Development workflow](development.md): run, test, build, add a provider
- [Privacy rules](privacy-rules.md): what ingesters may read and persist

Principle: **daemon writes usage + alerts; TUI reads, edits settings, adds manual spend.** SQLite is the only link between them.
