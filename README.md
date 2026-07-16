# GitLurk Desktop

Windows-focused Git client built with Tauri 2, React, TypeScript, and Bun.

## Packages

- `@gitlurk/app` — Tauri desktop application
- `@gitlurk/shared` — Typed IPC contracts, protocol parser, path validation
- `@gitlurk/git` — Hybrid Git service (system Git + bundled fallback)
- `@gitlurk/cli` — CLI companion (`gitlurk`, `gh` shortcuts, git config)
- `@gitlurk/plugin-sdk` — Plugin API types
- `@gitlurk/extension` — Chrome/Edge WebExtension bridge

## Development

```bash
bun install
bun run --filter @gitlurk/shared build
bun run dev
```

For the full desktop app with Tauri:

```bash
cd packages/app
bun run tauri:dev
```

## Architecture

See [docs/architecture.md](docs/architecture.md).

## CLI

See [docs/cli.md](docs/cli.md) for full command reference.

From the repo root:

```bash
bun link
gitlurk --help
gitlurk          # open cwd in GitLurk Desktop
gitlurk .        # same
gitlurk gh run list
gitlurk git config list --global
```

Resolution order for the desktop binary:

1. `GITLURK_DESKTOP_EXE`
2. `$CARGO_TARGET_DIR/release|debug/gitlurk-desktop.exe`
3. `target-dir` from `.cargo/config.toml` (same release/debug layout)
4. Local `packages/app/src-tauri/target/{release,debug}/…`
5. Fallback: `bun run --filter @gitlurk/app tauri dev --release --no-watch -- …`

## Protocol

`gitlurk://openRepo/https://github.com/owner/repo`

## License

MIT
