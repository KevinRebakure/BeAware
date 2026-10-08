# Privacy rules for ingesters

The tools BeAware reads store prompts, responses and file contents next to the usage numbers. These rules keep that text
out of BeAware. They apply to every provider under `src/providers/`; read them before adding one. User-facing summary:
[privacy and data security](../how-to-use-the-app/privacy-and-data-security.md).

1. **Allow-list, don't filter.** Persist only these fields: provider/source id, model, token counts, cost, timestamp, and
   ids needed for dedupe. Never "copy the record and remove the text".
2. **SQL sources use an explicit column list.** No `SELECT *`. Don't query tables that hold conversation text
   (Copilot's `turns`, `checkpoints`, search index…).
3. **File sources extract numbers and ids.** Parse the line/state, pick the fields, drop the rest. Parsed objects never
   leave the ingester function (see `extractRequests` in `copilot/vscode.ts`).
4. **Open third-party files read-only** (`new Database(path, { readonly: true })`, `"r"` file mode). Never write, move or
   delete another tool's data.
5. **No network.** An ingester must not make requests or shell out.
6. **Never log payloads.** Log provider id and an error message only. Don't put record contents in error messages.
7. **Keys are not content.** `ext_key` and cursor keys may contain ids and file paths. Don't put prompt text, titles or
   branch names in them. (Paths do reveal project directory names; that's disclosed in the user docs.)
8. **Don't touch credentials.** Never read auth/token files (e.g. `~/.config/github-copilot/`).

## Enforcement

`tests/privacy.test.ts` ingests fixtures whose prompt and response fields contain a sentinel string, then dumps **every
table** of the resulting database and asserts the sentinel is absent. When you add a provider:

- put the sentinel in the fixture's text fields (see `tests/providers/copilot-fixtures.ts`), and
- add that provider's fixture to the privacy test.

## Checklist for a new provider

- [ ] fields persisted are an explicit allow-list
- [ ] third-party data opened read-only, no network, no payload logging
- [ ] sentinel fixture added to `tests/privacy.test.ts`
- [ ] new location and fields added to the table in the user privacy doc
