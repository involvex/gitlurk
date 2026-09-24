# GitLurk Desktop Bridge (Chrome / Edge)

Adds **Open with GitLurk Desktop** to GitHub’s **Code → Local** clone menu, next to GitHub Desktop and Download ZIP. Clicking the link opens the desktop app’s in-app Clone dialog via `gitlurk://openRepo/...`.

## Prerequisites

- [Bun](https://bun.sh) >= 1.3.0
- GitLurk Desktop installed (so Windows handles the `gitlurk://` protocol)
- Build `@gitlurk/shared` once if you have not already:

```bash
bun run --filter @gitlurk/shared build
```

## Build

From the repo root:

```bash
bun run --filter @gitlurk/extension build
```

This writes `dist/content-script.js` and `dist/background.js`. The extension root for loading is `packages/extension` (manifest + icons stay at the package root).

## Pack (release zip)

```bash
bun run --filter @gitlurk/extension pack
```

Creates `packages/extension/gitlurk-extension-<version>.zip` containing `manifest.json`, `dist/`, and `icons/`. Unzip it, then Load unpacked on the unzipped folder.

## Load unpacked (Edge / Chrome)

1. Open `edge://extensions` or `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `packages/extension` (or the unzipped release folder that contains `manifest.json`).
5. Open any GitHub repository → **Code** → **Local** → **Open with GitLurk Desktop**.

After changing the content script, rebuild and click **Reload** on the extension card.

## Notes

- Match pattern is `https://github.com/*/*` (owner/repo pages).
- The extension only builds the protocol URL; cloning happens in the desktop Clone dialog.
