# Roadmap

Shippable backlog for GitLurk Desktop. Detailed feature notes live in `suggestions.md`.

## Now

- [ ] Fixup commits

## Later

- [ ] Remaining v0.2.0 rows in `suggestions.md` (per-file history, branch cleanup, plugin commands, workflow YAML viewer, CI-failure notifications)
- [ ] Share History Load older: free announcement draft in SHARE.md
- [ ] Share PR suggested changes: free announcement draft in SHARE.md
- [ ] Share raw unified PR diff toggle: free announcement draft in SHARE.md
- [ ] Share gh config read-back: free announcement draft in SHARE.md
- [ ] Share screenshot capture: free announcement draft in SHARE.md
- [ ] Share palette file-search: free announcement draft in SHARE.md
- [ ] Share file-type icons: free announcement draft in SHARE.md
- [ ] Share GPG signing config toggles: free announcement draft in SHARE.md
- [ ] Share external diff/merge presets: free announcement draft in SHARE.md
- [ ] Share per-repo notification preferences: free announcement draft in SHARE.md

## Done

- [x] #37 Per-repo notification preferences — mute per repo in Settings + sidebar; gates fetch OS notify and matching GitHub threads
- [x] #33 External diff/merge tool presets — Settings → Tools applies git difftool/mergetool via `dev:git-config-set`
- [x] #29 GPG signing config toggles — Developer panel Commit signing via `dev:git-config-get/set`
- [x] #16 File-type icons in tree — Overview explorer shows icons by extension/name
- [x] #13 Palette file-search entries — type in the command palette to jump to repo files
- [x] Screenshot capture action — call `screenshot:capture` with save-path dialog
- [x] gh config read-back in Developer panel — call `dev:gh-config-get` from UI
- [x] Raw unified PR diff toggle — wire `github:pr-diff` into PR detail UI (Per-file / Raw unified)
- [x] #11 PR "suggested changes" — Suggest change inserts a GitHub suggestion fence in `LineCommentComposer`
- [x] #4 History pagination ("Load older") — grow `git log -n` prefix from History panel
