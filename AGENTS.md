# AGENTS.md — GitLurk Desktop

Instructions for AI coding agents working on this repository.

---

## Project Overview

**GitLurk Desktop** is a Windows-focused Git client built with **Tauri 2** (Rust backend) and **React** (TypeScript frontend). It provides a desktop GUI for managing Git repositories, GitHub pull requests, CI run monitoring, and includes a CLI companion tool.

---

## Repository Structure

```
packages/
├── app/                  # Tauri desktop application (React + Rust)
│   ├── src/              # React frontend (components, stores, dispatcher, IPC)
│   └── src-tauri/        # Rust backend (commands, services, protocol handling)
├── shared/               # Typed IPC contracts, protocol parser, path validation
├── git/                  # Hybrid Git service (system Git + bundled fallback)
├── gh/                   # GitHub CLI wrapper
├── cli/                  # CLI companion (gitlurk command)
├── plugin-sdk/           # Plugin API type definitions
├── extension/            # Chrome/Edge WebExtension bridge
└── plugins/              # Plugin packages
    └── example-hello/    # Example plugin
```

---

## Technology Stack

### Frontend
- **React 19** — UI framework
- **TypeScript 5.9** — Type-safe JavaScript
- **Tailwind CSS 4** — Utility-first CSS (via `@tailwindcss/vite`)
- **Zustand 5** — Lightweight state management (slice pattern)
- **Vite 6** — Build tool and dev server
- **@xterm/xterm 5** — Terminal emulation
- **@git-diff-view/react** — Diff rendering

### Backend (Rust)
- **Tauri 2** — Desktop application framework
- **Serde / Serde JSON** — Serialization
- **Reqwest** — HTTP client (with rustls-tls)
- **Keyring** — Secure credential storage (Windows native)
- **tiny_http** — Local HTTP server (MCP hook)
- **portable-pty** — Pseudo-terminal support
- **dotenvy** — Environment variable loading

### Build & Tooling
- **Bun (>=1.3.0)** — Package manager, runtime, and bundler (REQUIRED, do not use npm/yarn/pnpm)
- **Cargo** — Rust build system (invoked via Tauri CLI)
- **ESLint 9** — Linting (flat config with typescript-eslint)
- **Prettier 3** — Code formatting
- **GitHub Actions** — CI/CD (Windows runner)

---

## Useful Commands

### Setup

```bash
bun install                    # Install all dependencies
bun run --filter @gitlurk/shared build   # Build shared package (required first)
```

### Development

```bash
bun run dev                    # Start Vite dev server only (no Tauri shell)
bun run tauri:dev              # Full desktop app with hot reload (REQUIRED for full functionality)
bun run --filter @gitlurk/app dev        # Start frontend dev server only
```

### Building

```bash
bun run build                  # Build all packages (shared → git → gh → cli → app)
bun run tauri:build            # Build production desktop app (MSI/NSIS installers)
```

### Code Quality

```bash
bun run lint                   # Run ESLint
bun run format                 # Format all files with Prettier
bun run format:check           # Check formatting (CI uses this)
bun run typecheck              # Type-check all packages
```

### Testing

```bash
bun test                       # Run all tests
bun test --filter @gitlurk/shared       # Tests for a specific package
bun test --filter @gitlurk/git
```

### CLI Development

```bash
bun link                       # Link CLI globally for local testing
gitlurk --help                 # Test CLI commands
gitlurk                        # Open current directory in GitLurk Desktop
gitlurk gh run list            # Wrap gh CLI commands
gitlurk git config list --global        # Wrap git commands
```

### Release

```powershell
bun run release                # Run release script (PowerShell)
bun run changelog              # Generate changelog
bun run publish:cli            # Publish CLI to npm
```

---

## Architecture

### Layer Overview

1. **Renderer (React + Zustand)** — UI, dispatcher, domain stores
2. **IPC (`@gitlurk/shared`)** — Typed channel contracts and events
3. **Main (Rust)** — Git execution, auth, dialogs, tray, protocol handler
4. **Integrations** — Browser extension, Explorer context menu, MCP localhost API

### Data Flow

```
GitHub.com / Extension → gitlurk:// → Rust protocol parser → url-action event → Dispatcher → Git commands
```

### Key Patterns

#### IPC Communication
- All renderer → Rust communication goes through `packages/app/src/ipc/client.ts`
- Never call `invoke()` directly outside of `ipc/client.ts`
- Channels are typed in `packages/shared/src/ipc/channels.ts`
- Channel names use colon-separated format (`git:status`), converted to underscore for Rust (`git_status`)

#### State Management (Zustand Slices)
- Store is composed of slices: `ReposSlice`, `AuthSlice`, `GitOpsSlice`, `UiSlice`
- Located in `packages/app/src/stores/`
- Access via `useAppStore` hook or `useAppStore.getState()` for imperative code

#### Dispatcher Pattern
- `packages/app/src/dispatcher/index.ts` orchestrates all app actions
- Dispatcher methods handle IPC calls, store updates, and error handling
- Always wrap IPC calls in try/catch with `getStore().setError()`

#### Component Structure
- Components are in `packages/app/src/components/`
- Functional components only (no class components)
- Use `useAppStore` selector for reactive state, `dispatcher` for actions

---

## Best Practices & Guidelines

### General

1. **Always use Bun** — Never use npm, yarn, or pnpm. This project requires Bun >=1.3.0.
2. **Build shared first** — `@gitlurk/shared` must be built before other packages that depend on it.
3. **Use `tauri:dev` for testing** — The app requires the Tauri shell for IPC to work. Running Vite alone will show errors.
4. **Windows is the primary target** — All development and CI runs on Windows.

### TypeScript

1. **Strict mode is enabled** — `tsconfig.base.json` has `"strict": true`. Do not disable it.
2. **Use proper types** — Avoid `any`. Use existing types from `@gitlurk/shared` where available.
3. **ESNext modules** — Use `import`/`export`, not CommonJS. All packages use `"type": "module"`.
4. **Target ES2022** — Do not use features beyond ES2022.

### React

1. **Functional components only** — No class components.
2. **Use Zustand selectors** — Select specific slices to minimize re-renders: `useAppStore((s) => s.repos)`.
3. **Imperative state access** — Use `useAppStore.getState()` in non-component code (dispatcher, event handlers).
4. **Type event handlers** — Use proper React types for events: `React.ChangeEvent<HTMLInputElement>`.

### IPC & Security

1. **Never expose raw IPC to UI** — All Tauri `invoke` calls must go through `ipc/client.ts`.
2. **Validate all paths** — Use `@gitlurk/shared/security` path validators before any git operation.
3. **Protocol URLs** — Only `github.com` hosts are allowed for remote repo actions.
4. **OAuth secrets** — Never commit `.env` files. Client secrets stay in Rust backend only.
5. **MCP server** — Binds to `127.0.0.1` with bearer token auth. Never expose to network.

### Rust (Tauri Backend)

1. **Edition 2021** — Rust edition is 2021.
2. **Serde for all serialization** — Use `#[derive(Serialize, Deserialize)]` for IPC types.
3. **Capability allowlist** — Tauri plugins require explicit capability configuration in `src-tauri/capabilities/`.
4. **Profile optimization** — Release builds use LTO, single codegen unit, and panic=abort.

### Code Style

1. **Prettier config** — Semicolons, single quotes, trailing commas, 80 char width, LF line endings.
2. **ESLint flat config** — Uses `typescript-eslint` and `react-hooks`/`react-refresh` plugins.
3. **Component naming** — PascalCase for components, camelCase for utilities/functions.
4. **File structure** — One component per file, name matches the export (e.g., `Sidebar.tsx` exports `Sidebar`).

### Error Handling

1. **Always wrap IPC calls** — Use try/catch with `getStore().setError()` for user-facing errors.
2. **Toast notifications** — Use `getStore().showToast()` for success messages.
3. **Loading states** — Set `setGitOpLoading(true/false)` around async operations.
4. **Graceful degradation** — Handle missing features (e.g., no GitHub remote) without crashing.

### Testing

1. **Bun test runner** — Uses Bun's built-in test runner (not Jest).
2. **Test location** — Tests go in `__tests__/` directories adjacent to source files.
3. **Setup file** — Global test setup is in `test/setup.ts`.
4. **Run before commit** — Always run `bun test` and `bun run typecheck` before committing.

### Git & Commits

1. **Conventional commits** — Use format: `type(scope): description` (e.g., `feat(auth): add device flow`).
2. **Commit types** — `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`.
3. **Scope** — Use package name or feature area: `app`, `shared`, `git`, `cli`, `auth`, `plugins`.
4. **Keep commits atomic** — One logical change per commit.

### Plugin Development

1. **Manifest format** — `gitlurk.plugin.json` with id, name, version, main, permissions, activationEvents.
2. **Permissions** — Declare required permissions in manifest (e.g., `git.read`, `ui.toast`, `http.fetch`).
3. **Sandboxed execution** — Plugins run in child processes, communicate via JSON-RPC over stdin/stdout.
4. **No filesystem access** — Without explicit permission, plugins cannot access the filesystem.

---

## Common Pitfalls

1. **Running `bun run dev` instead of `bun run tauri:dev`** — The app needs the Tauri shell for IPC. Vite-only mode will fail with "must run inside the desktop app" errors.

2. **Forgetting to build shared first** — If you get import errors, run `bun run --filter @gitlurk/shared build`.

3. **Using npm/yarn** — This project uses Bun workspaces. Other package managers will not work correctly.

4. **Committing `.env`** — Never commit `.env` files. Only `.env.example` is tracked.

5. **Calling `invoke()` directly** — Always use the typed wrappers in `ipc/client.ts`.

6. **Ignoring TypeScript errors** — CI runs `typecheck` and will fail the build.

7. **Windows path separators** — Git operations handle both `/` and `\`. Use forward slashes in code, let the OS handle conversion.

---

## CI/CD Pipeline

The CI workflow (`.github/workflows/ci.yml`) runs on Windows and performs:

1. Install dependencies (`bun install`)
2. Build packages (shared → git → gh → plugin-sdk)
3. Lint (`bun run lint`)
4. Format check (`bun run format:check`)
5. Test (`bun test`)
6. Typecheck all packages
7. Build frontend (`bun run --filter @gitlurk/app build`)

All steps must pass before merging.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `packages/shared/src/ipc/channels.ts` | IPC channel type definitions |
| `packages/shared/src/security/path-validator.ts` | Path validation utilities |
| `packages/shared/src/protocol/` | GitLurk URL protocol parser |
| `packages/app/src/ipc/client.ts` | IPC wrapper (all Tauri invoke calls) |
| `packages/app/src/dispatcher/index.ts` | App action orchestrator |
| `packages/app/src/stores/` | Zustand store slices |
| `packages/app/src/components/` | React UI components |
| `packages/app/src-tauri/src/lib.rs` | Rust backend entry point |
| `packages/app/src-tauri/src/commands/` | Tauri command handlers |
| `packages/app/src-tauri/Cargo.toml` | Rust dependencies |
| `packages/app/src-tauri/tauri.conf.json` | Tauri configuration |
| `packages/cli/src/cli.ts` | CLI entry point |
| `docs/architecture.md` | Architecture documentation |
| `docs/security.md` | Security model documentation |
| `docs/plugin-spec.md` | Plugin specification |
| `.env.example` | Environment variable template |
