# Tech stack

| Layer         | Tech                                                                      |
|---------------|---------------------------------------------------------------------------|
| Runtime       | [Bun](https://bun.sh) 1.4                                                 |
| Language      | TypeScript (ESM, `tsc --noEmit` for types)                                |
| TUI           | [Ink](https://github.com/vadimdemedes/ink) 8 + React 19, `ink-text-input` |
| Storage       | `bun:sqlite` (WAL mode)                                                   |
| Packaging     | `bun build --compile` → single binary (`build.ts`)                        |
| Background    | macOS launchd LaunchAgent                                                 |
| Notifications | `osascript` (macOS)                                                       |
| Tests         | `bun test`                                                                |

**No runtime deps** beyond Ink/React. Build stubs `react-devtools-core` (Ink's optional import).
