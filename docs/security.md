# Security Model

## Protocol Handler (`mygit://`)

- Only `github.com` hosts accepted for remote repo actions
- Parsed in Rust before emitting to renderer
- OAuth callbacks validated for required query params

## Path Validation

- Reject `..` segments
- Block system directories (`Windows`, `Program Files`)
- Canonicalize paths before git operations

## IPC

- Tauri capability allowlist for shell, dialog, deep-link
- UI never calls raw `invoke` outside `ipc/client.ts`

## MCP / HTTP Hook

- Binds to `127.0.0.1` on ephemeral port
- Requires `Authorization: Bearer <token>` header
- Token stored in `%APPDATA%/MyGit/mcp-token.txt`

## Plugins

- Manifest declares permissions
- Child process sandbox
- No filesystem or shell without explicit permission

## Updates

- `tauri-plugin-updater` signature verification required for release builds
