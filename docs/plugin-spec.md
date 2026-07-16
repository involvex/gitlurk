# GitLurk Plugin Specification v1

## Manifest (`gitlurk.plugin.json`)

```json
{
  "id": "example.hello",
  "name": "Hello Plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "permissions": ["git.read", "ui.toast"],
  "activationEvents": ["onRepoOpen"],
  "contributes": {
    "commands": [{ "id": "hello.say", "title": "Say Hello" }]
  }
}
```

## Permissions

| Permission   | Description              |
| ------------ | ------------------------ |
| `git.read`   | Read repository status   |
| `ui.toast`   | Show toast notifications |
| `http.fetch` | Fetch allowlisted URLs   |

## Runtime

Plugins are executed in a sandboxed child process. The host communicates via JSON-RPC over stdin/stdout.

## Marketplace API

```
GET /v1/plugins
GET /v1/plugins/:id
```

Response:

```json
{
  "id": "example.hello",
  "name": "Hello Plugin",
  "version": "1.0.0",
  "downloadUrl": "https://marketplace.gitlurk.dev/plugins/example.hello-1.0.0.zip",
  "sha256": "...",
  "permissions": ["git.read", "ui.toast"]
}
```
