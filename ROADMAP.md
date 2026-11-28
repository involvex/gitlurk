# Roadmap

Shippable backlog for GitLurk Desktop. Detailed feature notes live in `suggestions.md`.

## Now

- [ ] gh config read-back in Developer panel — call `dev:gh-config-get` from UI

## Later

- [ ] Screenshot capture action — call `screenshot:capture` with save-path dialog
- [ ] #13 Palette file-search entries
- [ ] #16 File-type icons in tree
- [ ] Remaining v0.2.0 rows in `suggestions.md` (GPG toggles, external tool presets, per-repo notifications, fixup, per-file history, branch cleanup, plugin commands, workflow YAML viewer, CI-failure notifications)
- [ ] Share History Load older: free announcement draft in SHARE.md
- [ ] Share PR suggested changes: free announcement draft in SHARE.md
- [ ] Share raw unified PR diff toggle: free announcement draft in SHARE.md

## Done

- [x] Raw unified PR diff toggle — wire `github:pr-diff` into PR detail UI (Per-file / Raw unified)
- [x] #11 PR "suggested changes" — Suggest change inserts a GitHub suggestion fence in `LineCommentComposer`
- [x] #4 History pagination ("Load older") — grow `git log -n` prefix from History panel
