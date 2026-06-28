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

Configuration is read from `.env` in the repo root during development, and from bundled `resources/oauth.env` in release builds (public values only: client ID + redirect URI).

| Variable               | Required | Notes                                                              |
| ---------------------- | -------- | ------------------------------------------------------------------ |
| `GITHUB_CLIENT_ID`     | Yes      | OAuth App Client ID                                                |
| `GITHUB_REDIRECT_URI`  | No       | Defaults to `http://127.0.0.1/callback`                            |
| `GITHUB_CLIENT_SECRET` | No       | Not used by Device Flow; loaded in Rust only, never sent to the UI |

Legacy aliases `MYGIT_GITHUB_*` are also supported.

Load order (later overrides earlier):

1. Repo root `.env` (dev)
2. Bundled `oauth.env` (release)
3. `.env` next to the installed executable
4. `%APPDATA%/dev.mygit.desktop/.env` (per-user override)

Copy `.env.example` to `.env` and set your Client ID:

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_REDIRECT_URI=http://127.0.0.1/callback
```

Run the desktop shell (not Vite alone):

```powershell
bun run tauri:dev
```

On `tauri build`, `build.rs` reads `.env` and writes `packages/app/src-tauri/resources/oauth.env` into the installer bundle. **Do not commit `.env`** — only `GITHUB_CLIENT_ID` and redirect URI are bundled; the client secret is never included in the bundle or frontend.

1. Create an OAuth App at GitHub → Settings → Developer settings → OAuth Apps.
2. Enable device flow and set scopes to `repo` and `read:user`.
3. Sign in from the sidebar → enter the user code at `https://github.com/login/device`.
4. Tokens are stored in the Windows credential manager (keyring); the renderer only receives the GitHub username.

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

After creating the app, copy the **Client ID** into `.env` as `GITHUB_CLIENT_ID`.

```env
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_REDIRECT_URI=http://127.0.0.1/callback
```

Then run:

```powershell
bun run tauri:dev
```

Or add `GITHUB_CLIENT_ID` as a CI/release secret for builds without a local `.env`.

### Device Flow sign-in (manual test)

- After sign-in, the sidebar shows `@username`.
- Pull requests load for repos with a `github.com` remote.
- `auth:github-device-poll` handles `slow_down` by increasing the poll interval.

- `tauri-plugin-updater` signature verification required for release builds
