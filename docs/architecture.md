# GitLurk Desktop Architecture

## Overview

GitLurk Desktop uses a Tauri 2 main process (Rust) for OS integration and a React renderer for UI and orchestration. Business logic flows through a typed IPC layer defined in `@gitlurk/shared`.

## Layers

1. **Renderer (React + Zustand)** — UI, dispatcher, domain stores
2. **IPC (`@gitlurk/shared`)** — Channel contracts and events
3. **Main (Rust)** — Git execution, auth, dialogs, tray, protocol handler
4. **Integrations** — Browser extension, Explorer context menu, MCP localhost API

## Data Flow

```
GitHub.com / Extension → gitlurk:// → Rust protocol parser → url-action event → Dispatcher → Git commands
```

## Security

- Protocol URLs allowlisted to `github.com`
- Repo paths validated before any git operation
- MCP HTTP bound to `127.0.0.1` with bearer token
- Plugins run in child processes with declared permissions
