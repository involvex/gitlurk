# MyGit Desktop

Windows-focused Git client built with Tauri 2, React, TypeScript, and Bun.

## Packages

- `@mygit/app` — Tauri desktop application
- `@mygit/shared` — Typed IPC contracts, protocol parser, path validation
- `@mygit/git` — Hybrid Git service (system Git + bundled fallback)
- `@mygit/cli` — CLI companion (`mygit open`, `mygit clone`)
- `@mygit/plugin-sdk` — Plugin API types
- `@mygit/extension` — Chrome/Edge WebExtension bridge

## Development

```bash
bun install
bun run --filter @mygit/shared build
bun run dev
```

For the full desktop app with Tauri:

```bash
cd packages/app
bun run tauri:dev
```

## Architecture

See [docs/architecture.md](docs/architecture.md).

## Protocol

`mygit://openRepo/https://github.com/owner/repo`

## License

MIT
