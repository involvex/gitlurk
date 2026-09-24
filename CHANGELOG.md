# Changelog

All notable changes to GitLurk Desktop.

## [Unreleased]

- feat(extension): open in-app clone UI from browser bridge ([2398ad3](https://github.com/involvex/gitlurk/commit/2398ad3))
- fix(app): keep ConPTY alive on view swap and add Copy Path menus ([ba0a0f5](https://github.com/involvex/gitlurk/commit/ba0a0f5))
- feat(gitignore): add 9 more templates (total 32) ([3ecb384](https://github.com/involvex/gitlurk/commit/3ecb384))
- feat(gitignore): implement .gitignore editor with embedded templates ([605b081](https://github.com/involvex/gitlurk/commit/605b081))
- fix(app): persist parent directory as default clone dir ([41beb3b](https://github.com/involvex/gitlurk/commit/41beb3b))
- feat(app): in-app update check and install UI ([1e3c1b9](https://github.com/involvex/gitlurk/commit/1e3c1b9))
- chore(release): embed updater public key and document signing env ([e211036](https://github.com/involvex/gitlurk/commit/e211036))
- docs: mark delivered suggestions and refresh stats ([87fd922](https://github.com/involvex/gitlurk/commit/87fd922))
- feat(dev): diagnostics export bundle ([b1e92cd](https://github.com/involvex/gitlurk/commit/b1e92cd))
- feat(app): image and binary diff previews ([aa920c4](https://github.com/involvex/gitlurk/commit/aa920c4))
- feat(app): ignore-whitespace diff toggle and autocrlf hint ([019d4f0](https://github.com/involvex/gitlurk/commit/019d4f0))
- feat(app): commit revert and copy-SHA actions in history ([bffb5e6](https://github.com/involvex/gitlurk/commit/bffb5e6))
- docs: re-audit feature suggestions and add five new items ([6ce56d2](https://github.com/involvex/gitlurk/commit/6ce56d2))
- feat(app): structured CI job viewer and SVG history graph ([08fd050](https://github.com/involvex/gitlurk/commit/08fd050))
- feat(app): add hunk staging ops, cherry-pick, amend, and settings backup ([e438fba](https://github.com/involvex/gitlurk/commit/e438fba))

## [v0.1.4](https://github.com/involvex/gitlurk/releases/tag/v0.1.4) - 2026-08-25

- v0.1.4 ([689cc9c](https://github.com/involvex/gitlurk/commit/689cc9c))
- feat(app): add fork & clone to Clone Dialog with remembered destination ([d14e362](https://github.com/involvex/gitlurk/commit/d14e362))
- feat(app): add tag management, commit templates, and notification enhancements ([a6645cd](https://github.com/involvex/gitlurk/commit/a6645cd))
- chore: update demo-repo submodule reference ([19a2a16](https://github.com/involvex/gitlurk/commit/19a2a16))
- feat(app): add screenshot capture ([330b338](https://github.com/involvex/gitlurk/commit/330b338))

## [v0.1.3](https://github.com/involvex/gitlurk/releases/tag/v0.1.3) - 2026-07-27

- v0.1.3 ([9c3c3c6](https://github.com/involvex/gitlurk/commit/9c3c3c6))
- feat(app): add Overview file tree, multi-terminal, and shell path fix ([b881148](https://github.com/involvex/gitlurk/commit/b881148))
- feat(app): themes, hotkeys, and Discover polish ([03118a7](https://github.com/involvex/gitlurk/commit/03118a7))

## [v0.1.2](https://github.com/involvex/gitlurk/releases/tag/v0.1.2) - 2026-07-16

- v0.1.2 ([c8b2f1f](https://github.com/involvex/gitlurk/commit/c8b2f1f))
- docs: add feature suggestions overview ([f56e020](https://github.com/involvex/gitlurk/commit/f56e020))
- feat: implement stash, discard, staging, history, and command palette ([c0cd21c](https://github.com/involvex/gitlurk/commit/c0cd21c))
- # AGENTS.md — GitLurk Desktop ([4671111](https://github.com/involvex/gitlurk/commit/4671111))
- fix: harden built-in terminal shell resolution on Windows ([976c074](https://github.com/involvex/gitlurk/commit/976c074))
- feat: clone flags, terminal shell setting, and faster settings ([1e81e63](https://github.com/involvex/gitlurk/commit/1e81e63))
- chore: bump safe patch and minor dependencies ([3e6b5b6](https://github.com/involvex/gitlurk/commit/3e6b5b6))
- fix: unblock CI typecheck and Prettier for shared/git ([d4fcce3](https://github.com/involvex/gitlurk/commit/d4fcce3))
- feat: add minimize-to-tray setting ([2c954d7](https://github.com/involvex/gitlurk/commit/2c954d7))
- fix: unfreeze Developer panel and add bell + tray actions ([90aa096](https://github.com/involvex/gitlurk/commit/90aa096))
- feat: in-app CI watch, sidebar action, and npm CLI package ([62c172e](https://github.com/involvex/gitlurk/commit/62c172e))
- feat: add gh pairing CLI, git config, and Developer panel ([e5b9714](https://github.com/involvex/gitlurk/commit/e5b9714))
- Harden CI portable Git install and app typecheck paths. ([f27da97](https://github.com/involvex/gitlurk/commit/f27da97))

## [v0.1.1](https://github.com/involvex/gitlurk/releases/tag/v0.1.1) - 2026-07-16

- Fix portable Git script repo-root path for CI. ([3d30d6b](https://github.com/involvex/gitlurk/commit/3d30d6b))
- Fix CI format EOL and release shared types build. ([5785f44](https://github.com/involvex/gitlurk/commit/5785f44))
- Normalize LF line endings for Prettier on CI. ([652b18d](https://github.com/involvex/gitlurk/commit/652b18d))
- v0.1.1 ([6c6794e](https://github.com/involvex/gitlurk/commit/6c6794e))
- Add GitHub funding config. ([02131c2](https://github.com/involvex/gitlurk/commit/02131c2))
- Add bun version bumper used by the release script. ([1a38356](https://github.com/involvex/gitlurk/commit/1a38356))
- Fix CI prettier check and add Tauri release script. ([8ac14d9](https://github.com/involvex/gitlurk/commit/8ac14d9))
- Add Discover hub, AI commits, resizable panels, and fix CLI open. ([fcc7efb](https://github.com/involvex/gitlurk/commit/fcc7efb))
- ✨ feat: load GitHub OAuth config from root .env ([53e790d](https://github.com/involvex/gitlurk/commit/53e790d))
- ✨ feat: add Phase 2 features and fix IPC command routing ([af7a334](https://github.com/involvex/gitlurk/commit/af7a334))
- fixes ([e6190f8](https://github.com/involvex/gitlurk/commit/e6190f8))
- fixes ([f9c43b8](https://github.com/involvex/gitlurk/commit/f9c43b8))
- created the desktop app ([9eca563](https://github.com/involvex/gitlurk/commit/9eca563))
