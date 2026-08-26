# GitLurk Desktop — Feature Suggestions

A collection of features that can be implemented to enhance GitLurk Desktop.

**Legend:** ✅ DONE · 🟡 PARTIAL · ❌ NOT STARTED

_Audited against codebase on 2026-08-26._

---

## Git Operations

### 1. Interactive Staging / Unstaging — 🟡 PARTIAL

**Priority: High** | **Complexity: Medium**

Currently, files are listed as staged/unstaged/untracked but there's no way to stage individual hunks or lines. Add interactive staging support:

- Stage/unstage individual hunks from the diff view
- Stage specific lines (like `git add -p`)
- Discard changes per-file or per-hunk

> **Have:** hunk-level stage/unstage/discard (`DiffPanel.tsx`, `git:apply-cached` with stage/unstage/discard modes); file-level staging/unstaging complete.
> **Missing:** line-level staging within a hunk.

### 2. Git Stash Support — ✅ DONE

**Priority: High** | **Complexity: Low**

Add stash operations to the UI:

- `git stash` — stash working changes
- `git stash pop` — apply and remove latest stash
- `git stash list` — show stash entries in a panel
- `git stash drop` — remove a specific stash entry

> Implemented push/list/apply/pop/drop full CRUD in `StashPanel.tsx` (`git:stash-push/list/apply/pop/drop`).

### 3. Git Rebase / Merge UI — ❌ NOT STARTED

**Priority: High** | **Complexity: Medium**

Provide a visual rebase/merge workflow:

- Select branches to merge or rebase onto
- Show conflict resolution UI with 3-way merge view
- Abort rebase/merge on conflict

### 4. Git Log / History View — 🟡 PARTIAL

**Priority: High** | **Complexity: Medium**

Add a commit history viewer:

- Linear commit log with author, date, message
- Graph view showing branch topology
- Click a commit to view its diff
- Filter by author, date range, or message

> **Have:** linear log + click-to-diff (`HistoryPanel.tsx`, `git:log`/`git:show`) and real SVG topology rendering (`CommitGraphRow.tsx` + `lib/graph-layout`).
> **Missing:** author/date/message filters, pagination beyond fixed limit of 80.

### 5. Discard Changes (git checkout / git restore) — ✅ DONE

**Priority: Medium** | **Complexity: Low**

Allow users to discard unstaged changes:

- Per-file discard with confirmation dialog
- Discard all unstaged changes
- Remove untracked files

> Implemented via `git:restore`, `git:restore-all`, `git:clean` with ConfirmDialog guards.

### 6. Cherry-Pick Support — ✅ DONE

**Priority: Medium** | **Complexity: Medium**

Add ability to cherry-pick commits from the history view:

- Select commits from log view
- Cherry-pick with option to auto-commit or stage

> Implemented via `git:cherry-pick` context action in `HistoryPanel.tsx`.

### 7. Tag Management — ✅ DONE

**Priority: Medium** | **Complexity: Low**

Add tag creation and listing:

- Create lightweight or annotated tags
- List existing tags
- Delete tags

> Implemented via `git:tag-list/create/delete` in `BranchPanel.tsx`.

---

## GitHub Integration

### 8. Create Pull Request from UI — ❌ NOT STARTED

**Priority: High** | **Complexity: Medium**

Currently PRs are only listed. Add a "Create PR" flow:

- Select source and target branches
- PR title and description editor
- Draft PR option
- Reviewers and labels assignment

> `PullRequestPanel.tsx` is list-only; no `gh pr create` anywhere. **Queued as Phase 4.1.**

### 9. Issue Management — ❌ NOT STARTED

**Priority: High** | **Complexity: Medium**

Add issue tracking integration:

- List issues for the current repo
- Create new issues
- Assign labels, milestones, and assignees
- Close/reopen issues

### 10. GitHub Actions Workflow Viewer — 🟡 PARTIAL

**Priority: High** | **Complexity: Medium**

A dedicated CI/CD panel beyond the current "watch run" feature:

- List all workflows and their recent runs
- Show job/step breakdown with timing
- Re-run failed workflows
- View workflow file content

> **Have:** run list, structured job/step breakdown with timing, live log tab, and re-run failed jobs (`GhRunWatchDialog.tsx`, `dev:gh-run-view`, `dev:gh-run-rerun --failed`).
> **Missing:** workflow YAML viewer, workflow/run filters.

### 11. Code Review in App — ❌ NOT STARTED

**Priority: High** | **Complexity: High**

Full PR review experience:

- View PR diff
- Add inline comments on code
- Approve / request changes / comment
- View existing review comments

> Blocked by #41 (PR Detail View).

### 12. Fork Management — 🟡 PARTIAL

**Priority: Medium** | **Complexity: Low**

Extend the existing fork feature:

- List user's forks of the current repo
- Sync fork with upstream
- Create PR from fork

> **Have:** `gh repo fork` + fork-and-clone flow that adds `upstream` remote; sync fork with upstream (`dev:gh-repo-sync`).
> **Missing:** PR from fork, listing existing forks.

---

## UI/UX Improvements

### 13. Keyboard Shortcuts — 🟡 PARTIAL

**Priority: High** | **Complexity: Medium**

Add customizable keyboard shortcuts:

- `Ctrl+Shift+P` — Command palette
- `Ctrl+B` — Toggle sidebar
- `Ctrl+Shift+C` — Quick commit
- `Ctrl+Shift+P` — Quick pull
- `F5` — Refresh status
- `Ctrl+K` — Quick file search

> **Have:** F5 refresh, Ctrl+B sidebar, Ctrl+Shift+C focus commit box, Ctrl+Shift+G pull, Ctrl+K/Ctrl+Shift+P palette (customizable), global Ctrl+Alt+G show-app.
> **Missing:** true quick-commit action (Ctrl+Enter), palette file-search entries.

### 14. Command Palette — ✅ DONE

**Priority: High** | **Complexity: Medium**

A Spotlight-style command palette for quick access:

- Fuzzy search for commands, repos, branches
- Recently used repos
- Quick actions (commit, pull, push, checkout)

> Implemented in `CommandPalette.tsx` — ~14 commands + dynamic repo/branch entries, token scoring, arrow-key nav.

### 15. Multi-Repository Workspace — ❌ NOT STARTED

**Priority: High** | **Complexity: Medium**

Support viewing multiple repos simultaneously:

- Tabbed or split-pane view for different repos
- Cross-repo search
- Aggregate status view across repos

### 16. File Tree / Explorer View — 🟡 PARTIAL

**Priority: Medium** | **Complexity: Medium**

Add a file explorer panel:

- Browse repository file tree
- Open files in system editor
- Quick file search by name
- Show file icons based on extension

> **Have:** lazy-loaded tree + README/text preview in `OverviewView.tsx` (`fs:list-dir`/`fs:read-file`).
> **Missing:** file-type icons, open-in-system-editor.

### 17. Visual Branch Graph — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Medium**

Enhance branch panel with visual graph:

- Show branch relationships visually
- Color-coded branches
- Drag-and-drop merge/rebase

### 18. Dark Mode Improvements — 🟡 PARTIAL

**Priority: Low** | **Complexity: Low**

Enhance the dark/light theme system:

- Custom theme builder
- High contrast mode for accessibility
- Per-repo theme override

> **Have:** light/dark/system + 4 presets including high-contrast.
> **Missing:** custom theme builder, per-repo override (arguably fine as-is).

---

## AI Features

### 19. AI-Powered Code Review — ❌ NOT STARTED

**Priority: High** | **Complexity: High**

Use AI to review staged changes before commit:

- Suggest improvements
- Detect potential bugs
- Check for security issues

### 20. AI Commit Message Enhancement — 🟡 PARTIAL

**Priority: Medium** | **Complexity: Low**

Extend the existing AI commit feature:

- Support conventional commit format enforcement
- Generate PR descriptions from diff
- Summarize changes across multiple commits

> **Have:** working commit generation across opencode/kilo providers.
> **Missing:** `style` param accepted by backend but never passed from UI; no conventional-commit validation; no PR description gen; no multi-commit summarization.

### 21. AI-Powered Git Help — ❌ NOT STARTED

**Priority: Low** | **Complexity: Low**

In-app AI assistant for git commands:

- Explain what a git command does
- Suggest commands based on intent
- Help resolve merge conflicts

---

## Developer Experience

### 22. Git Hooks Management — ❌ NOT STARTED

**Priority: High** | **Complexity: Medium**

Visual management of git hooks:

- List installed hooks (pre-commit, commit-msg, etc.)
- Enable/disable hooks
- Create/edit hook scripts
- Show hook execution logs

### 23. Submodule Management — 🟡 PARTIAL

**Priority: Medium** | **Complexity: Medium**

Submodule operations in the UI:

- Initialize and update submodules
- View submodule status
- Clone with submodules

> **Have:** clone-time `--recurse-submodules` flag only.

### 24. Git LFS Support — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Medium**

Large File Storage integration:

- Show LFS tracked files
- Install/uninstall LFS
- Migrate files to/from LFS

### 25. Interactive Git Rebase Editor — ❌ NOT STARTED

**Priority: Medium** | **Complexity: High**

A visual rebase editor:

- Drag-and-drop to reorder commits
- Squash, edit, reword, drop commits
- Preview changes before applying

---

## Performance & Reliability

### 26. Offline Support — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Medium**

Cache data for offline use:

- Cache GitHub notifications and feed
- Show cached data when offline
- Queue operations for when connection returns

### 27. Background Fetch — ✅ DONE

**Priority: Medium** | **Complexity: Low**

Auto-fetch remote changes:

- Periodic background fetch
- Show notification when new commits available
- Configurable fetch interval

> Renderer-side interval + OS notification when ahead; interval persisted & clamped 5–120 min.

### 28. Repository Watcher — ✅ DONE

**Priority: Low** | **Complexity: Low**

Watch file system changes:

- Auto-refresh status on file changes
- Debounced updates
- Show file change indicators

> Rust-side `notify` watcher with 1500 ms debounce emitting `repo-changed`; frontend refresh debounce 1200 ms.

---

## Security & Privacy

### 29. GPG Signing Support — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Medium**

Sign commits and tags with GPG keys:

- Detect available GPG keys
- Sign commits automatically
- Verify signatures on incoming commits

### 30. Secret Scanning — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Medium**

Scan for accidentally committed secrets:

- Detect API keys, tokens, passwords
- Pre-commit hook integration
- Show warnings before commit

---

## Integration & Extensibility

### 31. Custom Webhook Support — ❌ NOT STARTED

**Priority: Low** | **Complexity: Medium**

Configure webhooks for repo events:

- Send notifications to Slack, Discord, etc.
- Custom webhook URLs
- Event filtering

### 32. Git Worktree Support — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Medium**

Manage git worktrees:

- Create worktrees from branches
- List active worktrees
- Remove worktrees

### 33. External Diff Tool Integration — ❌ NOT STARTED

**Priority: Low** | **Complexity: Low**

Launch external diff tools:

- Configure custom diff tool (Beyond Compare, VS Code, etc.)
- Configure custom merge tool
- Open in external editor

### 34. SSH Key Management — ❌ NOT STARTED

**Priority: Low** | **Complexity: Medium**

Manage SSH keys within the app:

- Generate new SSH keys
- View existing keys
- Add keys to SSH agent
- Copy public key to clipboard

---

## Polish & Quality of Life

### 35. Search Across Repos — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Medium**

Global search functionality:

- Search across all open repos
- Full-text code search
- File name search
- Commit message search

> Note: GitHub remote repo search exists in DiscoverView; local cross-repo search does not.

### 36. Recent Repositories — ✅ DONE

**Priority: Low** | **Complexity: Low**

Quick access to recently opened repos:

- Recently used list in sidebar
- Pinned/favorite repos
- Search recent repos

> Pins + recents sort + context menu done; sidebar search input is the remaining gap (queued).

### 37. Notification Improvements — 🟡 PARTIAL

**Priority: Medium** | **Complexity: Low**

Enhance the notification system:

- System tray notifications for new PRs/reviews
- Custom notification sounds
- Notification preferences per repo

> **Have:** OS notifications on new unread notifications, tray menu; sound preference persisted in Rust `Settings` with WebAudio playback (`playNotificationSound`).
> **Missing:** per-repo notification preferences.

### 38. Export/Import Settings — ✅ DONE

**Priority: Low** | **Complexity: Low**

Backup and restore configuration:

- Export settings to JSON
- Import settings from file
- Sync settings across devices

> Implemented export/import via `app:export-settings` / `app:import-settings` with Settings dialog actions.

### 39. Changelog / What's New Panel — ✅ DONE

**Priority: Low** | **Complexity: Low**

Show release notes in-app:

- Display changelog on update
- Link to full release notes
- Mark items as read

> Implemented in `WhatsNewDialog.tsx` — version-gated auto-show via `lastSeenWhatsNewVersion`, palette command, mark-as-seen.

### 40. Onboarding Flow — ✅ DONE

**Priority: Medium** | **Complexity: Low**

First-run experience:

- Welcome screen with feature tour
- Initial setup wizard (sign in, select default shell)
- Quick start guide

> `OnboardingDialog.tsx`: welcome → optional GitHub sign-in → terminal shell picker → first-repo actions; gated by persisted `onboardingCompleted`.

---

## Recently Added

### 41. PR Detail View — ❌ NOT STARTED

**Priority: High** | **Complexity: Medium**

View a PR's metadata, description, and diff inside the app using `gh pr view --json` + `gh pr diff`. Prerequisite for #11 (Code Review).

### 42. Commit Amend & Fixup — 🟡 PARTIAL

**Priority: High** | **Complexity: Low**

Amend last commit (reuse or replace message), create fixup commits targeting recent SHAs.

> **Have:** amend last commit (keep or replace message) in `ChangesView.tsx` (`git:commit-amend`).
> **Missing:** fixup commits targeting recent SHAs.

### 43. Blame View — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Medium**

`git blame` gutter view per file, click a line's commit to open it in history.

### 44. Per-file History — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Low**

Log filtered to a single file, launched from explorer/changes view.

### 45. Branch Cleanup — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Low**

Detect branches merged into HEAD/upstream; delete stale local branches with confirmation.

### 46. Compare Branches — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Medium**

Pick any two branches and see their diff before merging.

### 47. Reflog Undo — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Medium**

"Undo" affordance after destructive ops (amend, reset) driven by reflog lookup.

### 48. .gitignore Editor + Templates — ❌ NOT STARTED

**Priority: Low** | **Complexity: Low**

Edit `.gitignore` in-app with template gallery (Node, Python, VS, macOS…).

### 49. Drag & Drop Folder Open — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Low**

Drop a folder onto the window to open it as a repository.

### 50. Repos Dashboard — ❌ NOT STARTED

**Priority: High** | **Complexity: Medium**

Aggregate ahead/behind/dirty status badges across all pinned repos in the sidebar footer.

### 51. Clickable Notifications Deep Links — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Low**

Clicking an OS notification or tray item focuses the relevant run/PR/repo (extends `tray-action` event pattern).

### 52. Plugin-contributed Commands — ❌ NOT STARTED

**Priority: Low** | **Complexity: Medium**

Plugins register entries into the Command Palette via manifest declarations.

### 53. Commit Revert + Copy SHA — ❌ NOT STARTED

**Priority: High** | **Complexity: Medium**

Revert commits from the history view (`git revert --no-edit <sha>`), plus context-menu QoL:

- Revert single commit with confirmation
- Copy commit SHA / message to clipboard
- Refresh log + status after revert

> Sits alongside the existing cherry-pick plumbing in `HistoryPanel.tsx` and `git.rs`.

### 54. In-App Update Check UI — ❌ NOT STARTED

**Priority: High** | **Complexity: Medium**

`tauri-plugin-updater` is fully wired on the Rust side (Cargo.toml, capabilities, tauri.conf.json) but unused by the frontend. Add:

- "Check for updates" action in Settings + What's New dialog
- Release notes display and download/install progress
- Restart-to-install affordance

### 55. Image/Binary Diff Preview — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Medium**

DiffPanel currently dead-ends at "Binary file changed." Add:

- Before/after image comparison for png/jpg/gif/webp/bmp/svg
- Size-delta info panel for other binaries
- Graceful fallback for oversized blobs

### 56. Whitespace/EOL Controls — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Low**

Windows-first app deserves first-class EOL handling:

- Ignore-whitespace diff toggle (`git diff -w --ignore-cr-at-eol`)
- CRLF/LF autocrlf advisory banner (reuse `dev:git-config-get`)

### 57. Diagnostics Export — ❌ NOT STARTED

**Priority: Low** | **Complexity: Low**

One-click bundle in DeveloperPanel for bug reports:

- App/git/gh versions, auth summary, sanitized settings JSON
- Saved via save dialog, path surfaced as toast

---

## Known Bugs

_No known bugs currently tracked._

> Previously tracked, both fixed: dead `notificationSoundEnabled` (now persisted in Rust `Settings` with WebAudio playback) and unreachable AI `style` param (now selectable in ChangesView and passed to `ai:generate-commit-message`).

---

## Statistics

| Category                    | Total  | Done   | Partial | Not started |
| --------------------------- | ------ | ------ | ------- | ----------- |
| Git Operations              | 7      | 4      | 2       | 1           |
| GitHub Integration          | 5      | 0      | 2       | 3           |
| UI/UX Improvements          | 6      | 1      | 3       | 2           |
| AI Features                 | 3      | 0      | 1       | 2           |
| Developer Experience        | 4      | 0      | 1       | 3           |
| Performance & Reliability   | 3      | 2      | 0       | 1           |
| Security & Privacy          | 2      | 0      | 0       | 2           |
| Integration & Extensibility | 4      | 0      | 0       | 4           |
| Polish & Quality of Life    | 6      | 4      | 1       | 1           |
| Recently Added              | 17     | 0      | 1       | 16          |
| **Total**                   | **57** | **11** | **11**  | **35**      |

---

_Last updated: 2026-08-26_
