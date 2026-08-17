# GitLurk Desktop

**Windows-focused Git client** — Pull Requests, CI monitoring, notifications, AI commit messages, and an embedded terminal. Built with Tauri 2, React, and TypeScript.

<p align="center">
  <img src="docs/images/01-changes-view.png" alt="GitLurk Desktop main workspace" width="800">
</p>

[![Version](https://img.shields.io/badge/version-0.1.3-blue)](https://github.com/involvex/gitlurk/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6)](https://github.com/involvex/gitlurk)

---

## Features

### Git Operations

Stage, unstage, and discard files — per-file, per-hunk, or in bulk. Commit, pull, push, and fetch from a unified workspace.

- **Changes view** with staged, unstaged, and untracked file lists
- **Diff viewer** with syntax highlighting (unified and side-by-side)
- **Commit history** with branch topology graph and per-commit diffs
- **Branch management** — create, checkout, and visual branch graph
- **Stash panel** — push, pop, and drop stashes
- **File tree browser** — explore the repo from within the app

<p align="center">
  <img src="docs/images/02-history-graph.png" alt="Commit history with graph" width="400">
  <img src="docs/images/03-branches.png" alt="Branch management panel" width="400">
</p>

### GitHub Integration

Connect your GitHub account to manage pull requests, notifications, and explore repositories without leaving the app.

- **Pull Requests** — list open PRs for any repo with one click to open in browser
- **Notifications** — desktop toasts and in-app notification panel with mark-as-read
- **Discover Hub** — activity feed, repository search, trending repos, and your repos
- **Device Flow auth** — secure OAuth sign-in via GitHub.com, tokens stored in Windows Credential Manager

<p align="center">
  <img src="docs/images/04-pull-requests.png" alt="Pull Request list" width="400">
  <img src="docs/images/05-discover-hub.png" alt="Discover Hub with search and trending" width="400">
</p>

### CI/CD — GitHub Actions

Watch CI runs live from the app. Stream logs in real time, fork repos, and create releases — all powered by GitHub CLI.

- **Run list** — view recent workflow runs with status and workflow name
- **Live log streaming** — watch a run in real time with output streamed to a dialog
- **Fork & release** — fork repos and create GitHub releases from the developer panel

<p align="center">
  <img src="docs/images/07-ci-watch.png" alt="CI run live watch" width="400">
  <img src="docs/images/08-settings.png" alt="Settings and Developer panel" width="400">
</p>

### AI Commit Messages

Generate conventional commit messages from your staged diffs using AI. Supports multiple providers.

- **OpenCode** (free, included) — uses `deepseek-v4-flash-free` model
- **Kilo** — bring your own API key and custom base URL
- **Test connection** — verify your AI provider before committing

<p align="center">
  <img src="docs/images/06-ai-commit.png" alt="AI commit message generation" width="800">
</p>

### Embedded Terminal

Full pseudo-terminal (PTY) embedded in a resizable pane at the bottom of the workspace. Multi-session support with configurable shells.

- **Multi-session** — spawn multiple terminal sessions, switch between tabs
- **Configurable shell** — PowerShell 7, Windows PowerShell 5, CMD, or custom shell path
- **Auto-cwd** — opens at the active repository root

<p align="center">
  <img src="docs/images/09-terminal.png" alt="Embedded terminal pane" width="800">
</p>

### UI & UX

A polished, responsive interface built for daily use.

- **Resizable panels** — sidebar, file list, right rail, and terminal height all adjustable
- **Four themes** — GitHub Dark, GitHub Light, Dim, and High Contrast with light/dark/system mode
- **Command palette** — fuzzy-search for commands, repos, and branches (Ctrl+Shift+P)
- **Keyboard shortcuts** — pull (Ctrl+Shift+G), commit focus (Ctrl+Shift+C), sidebar toggle (Ctrl+B), refresh (F5)
- **System tray** — minimize to tray with right-click actions (pull, notifications, discover, settings)
- **Windows Explorer integration** — "Open with GitLurk Desktop" context menu for folders

<p align="center">
  <img src="docs/images/11-command-palette.png" alt="Command palette" width="400">
  <img src="docs/images/10-themes.png" alt="Theme switching" width="400">
</p>

### CLI Companion

The `gitlurk` CLI wraps common GitHub and Git workflows:

```bash
gitlurk                 # open current directory in GitLurk Desktop
gitlurk open <path>     # open a local repository
gitlurk clone <url>     # clone via the desktop app

# GitHub CLI shortcuts
gitlurk gh run list
gitlurk runs
gitlurk watch [run-id]
gitlurk fork [repo]
gitlurk release create <tag>

# Git config management
gitlurk git config list --global
gitlurk git config set user.email "you@example.com" --global
```

[Full CLI reference →](docs/cli.md)

### Plugins

Extend GitLurk with plugins from the marketplace. Plugins run in sandboxed child processes with declared permissions.

- **Marketplace browser** — discover and install plugins from the in-app catalog
- **Permissions model** — `git.read`, `ui.toast`, `http.fetch`
- **JSON-RPC protocol** — host communicates with plugins over stdin/stdout

[Plugin specification →](docs/plugin-spec.md)

### Security

- **Path validation** — all Git operations validate paths against `..` traversal and system directories
- **IPC isolation** — all Tauri `invoke` calls go through a single typed wrapper
- **Protocol allowlist** — `gitlurk://` protocol only accepts `github.com` hosts
- **Token storage** — credentials stored in Windows Credential Manager, never exposed to the renderer
- **Plugin sandboxing** — child processes with declared permissions, no filesystem access by default

[Security model →](docs/security.md)

---

## Getting Started

### Prerequisites

- **Windows 10 or 11**
- **Git** — bundled portable Git is included as a fallback
- **GitHub CLI** (optional) — for CI features and developer panel

### Install

Download the latest installer from [Releases](https://github.com/involvex/gitlurk/releases):

| Installer                     | Format         |
| ----------------------------- | -------------- |
| **GitLurk.Desktop.msi**       | Windows MSI    |
| **GitLurk.Desktop-setup.exe** | NSIS installer |

Or install the CLI companion:

```bash
npm i -g @involvex/gitlurk-desktop
gitlurk install-desktop
```

### Quick Start

1. **Open a repo** — click "Open repository" or drag a folder onto the window
2. **Stage changes** — select files in the Changes view and click stage
3. **Review diffs** — click any file to see the diff
4. **Commit** — write a message or generate one with AI
5. **Push** — push to the remote

### GitHub Sign-In

1. Click **Sign In** in the sidebar
2. Enter the code at `https://github.com/login/device`
3. Pull requests, notifications, and discover features unlock automatically

---

## Development

```bash
# Prerequisites: Bun >=1.3.0, Rust toolchain
bun install
bun run --filter @gitlurk/shared build

# Frontend-only dev server
bun run dev

# Full desktop app (required for IPC)
bun run tauri:dev
```

### Project Structure

```
packages/
├── app/                  # Tauri desktop application (React + Rust)
│   ├── src/              # React frontend
│   └── src-tauri/        # Rust backend
├── shared/               # Typed IPC contracts and protocol parser
├── git/                  # Hybrid Git service (system + bundled fallback)
├── gh/                   # GitHub CLI wrapper
├── cli/                  # CLI companion (gitlurk command)
├── plugin-sdk/           # Plugin API type definitions
├── extension/            # Chrome/Edge WebExtension bridge
└── plugins/              # Plugin packages
```

### Code Quality

```bash
bun run lint              # ESLint
bun run format:check      # Prettier check
bun run typecheck         # TypeScript type checking
bun test                  # Run all tests
```

[Architecture docs →](docs/architecture.md)

---

## License

MIT © [GitLurk](https://github.com/involvex/gitlurk)
