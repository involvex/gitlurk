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

## GitHub OAuth (Device Flow)

1. Create an OAuth App at GitHub → Settings → Developer settings → OAuth Apps.
2. Enable device flow for the app and set scopes to `repo` and `read:user`.
3. Provide the Client ID at build or dev time — never commit a production Client ID:
   - Dev: `MYGIT_GITHUB_CLIENT_ID=<id> bun run tauri:dev`
   - CI/release: set `MYGIT_GITHUB_CLIENT_ID` as a repository secret
   - Optional compile-time fallback: `MYGIT_GITHUB_CLIENT_ID` env var during `cargo build`
4. Sign in from the sidebar → enter the user code at `https://github.com/login/device`.
5. Tokens are stored in the Windows credential manager (keyring); the renderer only receives the GitHub username.

### GitHub OAuth App registration (Device Flow)

Create an **OAuth App** (not a GitHub App) at  
https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**.

| Field                          | What to enter                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Application name**           | `MyGit Desktop` (or any name you prefer)                                                                                         |
| **Homepage URL**               | Your repo or project page, e.g. `https://github.com/<you>/github-desktop-app` — or `http://localhost` if you have no public site |
| **Application description**    | Optional — e.g. `Windows Git desktop client`                                                                                     |
| **Authorization callback URL** | `http://127.0.0.1/callback` — required by the form but **not used** by Device Flow; localhost is fine                            |
| **Enable Device Flow**         | **Checked** (required)                                                                                                           |

After creating the app, copy the **Client ID** (not the client secret — Device Flow does not use it in the desktop app).

Set it when developing:

```powershell
$env:MYGIT_GITHUB_CLIENT_ID = "<your-client-id>"
bun run tauri:dev
```

Or add `MYGIT_GITHUB_CLIENT_ID` as a CI/release secret for builds.

### Device Flow sign-in (manual test)

- After sign-in, the sidebar shows `@username`.
- Pull requests load for repos with a `github.com` remote.
- `auth:github-device-poll` handles `slow_down` by increasing the poll interval.

- `tauri-plugin-updater` signature verification required for release builds
