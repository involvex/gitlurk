# GitLurk Desktop — Feature Suggestions

A collection of features that can be implemented to enhance GitLurk Desktop.

**Legend:** ✅ DONE · 🟡 PARTIAL · ❌ NOT STARTED

_Audited against codebase on 2026-11-28._

## Roadmap — verified shippable backlog

_Each item below was checked against the codebase on 2026-11-28. "Anchor" names existing code that makes it shippable. Effort: S = hours/days, M = ~1–2 weeks. This is a planning backlog, not a commitment to ship dates._

### v0.2.0 — Parity & polish (mostly frontend, low risk)

| #   | Item                                        | Effort | Anchor (proof it's doable)                                                                                                        | Caveat                                                              |
| --- | ------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 4   | History pagination ("Load older") — ✅ DONE | S      | `dispatcher.loadOlderCommits()` grows `git log -n` prefix; `HistoryPanel` Load older button; Rust cap 2000                        | Graph layout receives full loaded prefix                            |
| 11  | PR "suggested changes" — ✅ DONE            | S      | `LineCommentComposer` **Suggest change** + `lib/pr-suggestion.ts` inserts ```suggestion fence via existing `github:submit-review` | Single-line seed from patch; no new API field                       |
| —   | Raw unified PR diff toggle — ✅ DONE        | S      | `PrDetailView` Per-file / Raw unified toggle; `dispatcher.loadPullRequestRawDiff` → `github:pr-diff`                              | Lazy-loaded; cleared on PR refresh                                  |
| —   | gh config read-back — ✅ DONE               | S      | DeveloperPanel **Get gh config** + set read-back via `dev:gh-config-get`                                                          | List/set already existed                                            |
| —   | Screenshot capture — ✅ DONE                | S      | `dispatcher.captureScreenshot` → `dialog:save-directory` + `screenshot:capture`; Developer panel + palette                        | PNG named with timestamp in chosen folder                           |
| 13  | Palette file-search entries                 | S      | `dispatcher.listRepoDir` + `readRepoFile`; `CommandPalette.tsx` command list is static/dynamic today                              | Ctrl+Enter quick-commit already exists in `ChangesView.tsx`         |
| 16  | File-type icons in tree                     | S      | `OverviewView.TreeNode` currently renders generic glyphs                                                                          | Open-in-editor already exists via external tools / `shell:run-tool` |
| 29  | GPG signing config toggles                  | S–M    | `dev:git-config-set/get` can set `commit.gpgSign`, `gpg.format`, `user.signingKey`                                                | Key detection/verification needs small Rust wrappers if added       |
| 33  | External diff/merge tool presets            | S      | `ExternalTool` + `shell:run-tool` placeholders + `dev:git-config-set`                                                             | Keep allowlist/placeholder validation intact                        |
| 37  | Per-repo notification preferences           | S      | `RepoEntry`/settings plumbing exists; `maybeNotify` call sites in dispatcher                                                      | Add per-repo opt-out field; default enabled                         |
| 42  | Fixup commits                               | S      | `git:commit-amend` exists; `HistoryPanel` has confirm patterns                                                                    | Add `git:commit-fixup` channel/command + UI picker                  |
| 44  | Per-file history                            | S      | `git:log` has `range?` but no path; `GitService::log` builds args                                                                 | Add `path` param and push `-- <file>` as separate arg               |
| 45  | Branch cleanup (merged/stale)               | S      | `git:branch-list`, `ConfirmDialog`, generic `GitService::exec`                                                                    | Add delete/merged-branches channels; protect current branch         |
| 52  | Plugin-contributed commands                 | S–M    | Plugin manifest/SDK declare `contributes.commands`; Rust `plugin_host.rs` ignores them and invoke is hardcoded                    | Extend manifest parsing + command listing + palette wiring          |
| 10  | Workflow YAML viewer + run filters          | S–M    | `fs:list-dir`/`fs:read-file` can read `.github/workflows/*.yml`; `GhRunWatchDialog` tabs exist                                    | Add workflow/status filter UI and file viewer tab                   |
| —   | CI-failure desktop notifications _(new)_    | S      | Existing 60s notification polling + `sendNotification` in dispatcher; CI run data already fetched                                 | Detect new failed runs; no new Rust command required                |

### v0.2.1 — Git depth (small, well-understood Rust commands)

| #   | Item                                      | Effort | Anchor (proof it's doable)                                           | Caveat                                                      |
| --- | ----------------------------------------- | ------ | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| 3   | Basic merge / rebase + abort              | M      | `GitService::exec()` + branch/confirm UI patterns                    | **Skip 3-way conflict viewer** for v0.2.x                   |
| 23  | Submodule status / init / update          | M      | `git:clone {recurseSubmodules}` exists; `exec()` wrappers are cheap  | Add right-rail/panel UI and status parsing                  |
| 32  | Worktree list / add / remove              | M      | `exec()` + `addRepo`/`selectRepo` can register worktree paths        | Path validation and watcher behavior need care              |
| 43  | Blame view                                | M      | `git:show`/diff rendering exists; add `git blame --line-porcelain`   | New parser + gutter UI in `DiffPanel`                       |
| 46  | Compare branches / refs                   | S–M    | `git:log range` already used for ahead/behind; `DiffView` exists     | Add `git:compare {a,b}` channel returning diff              |
| 1   | Line-level staging in a hunk              | M      | `DiffPanel.splitDiffHunks` + `dispatcher.applyPatch(patch, mode)`    | Rebuild sub-patch with adjusted `@@` counts; no Rust change |
| 24  | Git LFS status / install / track          | M      | Generic `GitService::exec`; UI patterns exist                        | Depends on external `git-lfs` binary                        |
| 47  | Reflog undo after amend/revert            | M      | `exec('git reflog')` + confirm dialogs + existing revert/amend flows | Destructive action; require explicit confirmation           |
| —   | Branch rename + remote management _(new)_ | S–M    | `git_service.rs` has branch/remote basics; `exec()` available        | Add list/remove/set-url/rename commands and UI              |
| 21  | AI Git help dialog                        | S      | `ai.rs` chat-completions + keyring + model plumbing                  | No diff context required; simple prompt dialog              |
| 20  | AI PR description generation              | S–M    | Reuse `build_diff_summary` and existing AI command patterns          | Add new `ai:generate-pr-description` channel/command        |

### v0.2.2 — GitHub & platform depth

| #   | Item                             | Effort | Anchor (proof it's doable)                                                        | Caveat                                                            |
| --- | -------------------------------- | ------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 9   | Issue list / create / close      | M      | `github.rs` has reqwest + auth headers; issue labels endpoint already used        | Add REST commands/channels + Discover/Issues UI                   |
| 12  | List forks + create PR from fork | M      | `dev:gh-repo-fork`/`sync`, `github:create-pr {head,base}` exist                   | Need `github:list-forks` and owner/head override support          |
| 17  | Read-only visual branch graph    | M      | `CommitGraphRow` + `lib/graph-layout.ts` + `git log --graph` exist                | **Defer drag-and-drop merge/rebase**                              |
| 19  | AI review of staged changes      | M      | `ai.rs` + `git:diff`/`git:show` + `build_diff_summary`                            | Render findings beside `DiffPanel`; advisory only                 |
| 35  | Cross-repo name/commit search    | M      | `RepoEntry` store + `git:log` per repo; Discover remote search exists             | **Full-text code search deferred**                                |
| 51  | Tray notification deep links     | M      | `dispatcher.openNotification` + `parseGitHubPullUrl` + tray-action handling exist | OS notification click needs Tauri v2 API verification             |
| 30  | Secret scanning (advisory)       | S–M    | Staged diff text available via `git:diff`; commit flow has confirm points         | Regex-based advisory scanner; avoid false-certainty claims        |
| 22  | Git hooks management             | M      | `dev:git-config-set core.hooksPath` + `fs:read-file` exist                        | **Do not relax `fs:write-file` blindly**; add scoped hook channel |
| 49  | Drag & drop folder open          | M      | `dispatcher.openLocalRepo` + `git:is-repo` exist                                  | Tauri v2 `DataTransfer` file-path behavior needs verification     |

### Deferred / blocked (not in v0.2.x)

| #   | Item                                     | Why deferred/blocked                                                                                            | Revisit when                                                                    |
| --- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 15  | Multi-repository workspace               | Requires refactoring many git flows off global `activeRepoPath`                                                 | After per-repo context refactor                                                 |
| 25  | Interactive rebase editor                | Todo-list generation/edit/resume + conflict state machine is large                                              | After basic merge/rebase/conflict UX matures                                    |
| 26  | Full offline support                     | Needs operation queue/sync semantics; architectural                                                             | After cache model designed; small cached-notifications slice possible sooner    |
| 54  | End-to-end updates                       | UI complete; no signed `latest.json` publication in release pipeline; no auto-relaunch (`tauri-plugin-process`) | When release workflow publishes manifest + signed artifacts to updater endpoint |
| 18  | Custom theme builder / per-repo override | Builder M, per-repo override L and schema/rerender complexity                                                   | After theme token model stabilized                                              |
| 31  | Custom webhooks                          | Low value and extra security/surface area                                                                       | After core GitHub/Git parity backlog                                            |
| 34  | SSH key management                       | Security-sensitive key generation/agent operations                                                              | After security review and scoped command design                                 |

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

### 4. Git Log / History View — ✅ DONE

**Priority: High** | **Complexity: Medium**

Add a commit history viewer:

- Linear commit log with author, date, message
- Graph view showing branch topology
- Click a commit to view its diff
- Filter by author, date range, or message

> **Have:** linear log + click-to-diff (`HistoryPanel.tsx`, `git:log`/`git:show`) and real SVG topology rendering (`CommitGraphRow.tsx` + `lib/graph-layout`). Filter by message/author/date/SHA added. Pagination via **Load older** (grows `git log -n` prefix in steps of 80, cap 2000).
> **Missing:** nothing for the basic history viewer.

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

### 8. Create Pull Request from UI — ✅ DONE

**Priority: High** | **Complexity: Medium**

Currently PRs are only listed. Add a "Create PR" flow:

- Select source and target branches
- PR title and description editor
- Draft PR option
- Reviewers and labels assignment

> Implemented `CreatePrDialog.tsx` + `github:create-pr` with optional reviewers (`github:request-reviewers`) and labels (`github:set-pr-labels` / `github:list-labels`). Opens the new PR in the in-app detail view after create.

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

### 11. Code Review in App — 🟡 PARTIAL

**Priority: High** | **Complexity: High**

Full PR review experience:

- View PR diff
- Add inline comments on code
- Approve / request changes / comment
- View existing review comments
- Merge / close / reopen from the detail view

> **Have:** PR file diffs in `PrDetailView.tsx`; submit Comment / Approve / Request changes via `github:submit-review`; list existing reviews via `github:list-reviews`; list and post line comments via `github:list-review-comments` + review `comments` array (DiffView + widget composer); **Suggest change** inserts a GitHub ```suggestion fence seeded from the patch line (`lib/pr-suggestion.ts`); merge (merge/squash/rebase), close, reopen, and ready-for-review via `github:merge-pr` / `github:update-pr` with mergeable gating.
> **Missing:** multi-line suggestion ranges.

### 12. Fork Management — 🟡 PARTIAL

**Priority: Medium** | **Complexity: Low**

Extend the existing fork feature:

- List user's forks of the current repo
- Sync fork with upstream
- Create PR from fork

> **Have:** `gh repo fork` + fork-and-clone flow that adds `upstream` remote; sync fork with upstream (`dev:gh-repo-sync` / `dispatcher.syncFork`).
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

> **Have:** F5 refresh, Ctrl+B sidebar, Ctrl+Shift+C focus commit box, Ctrl+Shift+G pull, Ctrl+K/Ctrl+Shift+P palette (customizable), global Ctrl+Alt+G show-app, Ctrl+Enter quick commit in `ChangesView.tsx` (textarea keydown).
> **Missing:** palette file-search entries.

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

> **Have:** lazy-loaded tree + README/text preview in `OverviewView.tsx` (`fs:list-dir`/`fs:read-file`); open-in-system-editor via external tools/context menu + `shell:run-tool`.
> **Missing:** file-type icons.

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

> **Have:** working commit generation across opencode/kilo providers. Style param now passed from UI (`ChangesView.tsx` select).
> **Missing:** conventional-commit validation; no PR description gen; no multi-commit summarization.

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

> Pins + recents sort + context menu + search input done in `Sidebar.tsx`.

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

### 41. PR Detail View — ✅ DONE

**Priority: High** | **Complexity: Medium**

View a PR's metadata, description, and diff inside the app using `gh pr view --json` + `gh pr diff`. Prerequisite for #11 (Code Review).

> Implemented `PrDetailView.tsx` via GitHub REST (`github:get-pr`, `github:pr-files`, `github:pr-diff`) with checkout, checks matched to `head.sha`, review actions, and a Per-file / Raw unified diff toggle (lazy `github:pr-diff`). Opened from the PR list and after create.

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

### 48. .gitignore Editor + Templates — ✅ DONE

**Priority: Low** | **Complexity: Low**

Edit `.gitignore` in-app with template gallery (Node, Python, VS, macOS…).

> Implemented via `GitignoreEditor.tsx` with embedded templates (32).

### 49. Drag & Drop Folder Open — ❌ NOT STARTED

**Priority: Medium** | **Complexity: Low**

Drop a folder onto the window to open it as a repository.

### 50. Repos Dashboard — ✅ DONE

**Priority: High** | **Complexity: Medium**

Aggregate ahead/behind/dirty status badges across all pinned repos in the sidebar footer.

> Implemented `ReposDashboardView` with expandable cards, ahead/behind, CI runs, branch status, and multi-repo background refresh.

### 51. Clickable Notifications Deep Links — 🟡 PARTIAL

**Priority: Medium** | **Complexity: Low**

Clicking an OS notification or tray item focuses the relevant run/PR/repo (extends `tray-action` event pattern).

> **Have:** In-app Discover notification clicks for PullRequest subjects focus the matching local repo and open `PrDetailView` (`dispatcher.openNotification` + `parseGitHubPullUrl`). Tray still opens the notifications tab.
> **Missing:** OS desktop notification click → deep link; tray item → specific PR/run.

### 52. Plugin-contributed Commands — 🟡 PARTIAL

**Priority: Low** | **Complexity: Medium**

Plugins register entries into the Command Palette via manifest declarations.

> **Have:** plugin manifest/SDK declare `contributes.commands` and plugin command registration in the SDK surface.
> **Missing:** Rust plugin host/dispatcher/palette wiring is incomplete (host ignores contributed commands; invoke path is hardcoded).

### 53. Commit Revert + Copy SHA — ✅ DONE

**Priority: High** | **Complexity: Medium**

Revert commits from the history view (`git revert --no-edit <sha>`), plus context-menu QoL:

- Revert single commit with confirmation
- Copy commit SHA / message to clipboard
- Refresh log + status after revert

> Implemented via `git:revert` (`git_revert` command) with Revert / Copy SHA / Copy message actions in `HistoryPanel.tsx`.

### 54. In-App Update Check UI — 🟡 PARTIAL

**Priority: High** | **Complexity: Medium**

`tauri-plugin-updater` is fully wired on the Rust side (Cargo.toml, capabilities, tauri.conf.json). Add:

- "Check for updates" action in Settings + What's New dialog
- Release notes display and download/install progress
- Restart-to-install affordance

> **Have:** minisign keypair generated; real pubkey embedded in `tauri.conf.json`; `UpdateDialog.tsx` with check/notes/progress/installed states via the plugin's JS API (`ipc/updater.ts`), wired into Settings + What's New.
> **Missing:** end-to-end updates are blocked on release pipeline work (`latest.json` publication, signed artifact hosting at the updater endpoint) and auto-relaunch support (`tauri-plugin-process`). UI is complete in-app.

### 55. Image/Binary Diff Preview — ✅ DONE

**Priority: Medium** | **Complexity: Medium**

DiffPanel currently dead-ends at "Binary file changed." Add:

- Before/after image comparison for png/jpg/gif/webp/bmp/svg
- Size-delta info panel for other binaries
- Graceful fallback for oversized blobs

> Implemented via `BinaryDiffView.tsx` + `git:blob-content` (`HEAD`/`:0`/worktree reads, 10 MB cap).

### 56. Whitespace/EOL Controls — ✅ DONE

**Priority: Medium** | **Complexity: Low**

Windows-first app deserves first-class EOL handling:

- Ignore-whitespace diff toggle (`git diff -w --ignore-cr-at-eol`)
- CRLF/LF autocrlf advisory banner (reuse `dev:git-config-get`)

> Toggle in DiffPanel header persists per session; ChangesView shows a dismissible banner when `core.autocrlf` is unset.

### 57. Diagnostics Export — ✅ DONE

**Priority: Low** | **Complexity: Low**

One-click bundle in DeveloperPanel for bug reports:

- App/git/gh versions, auth summary, sanitized settings JSON
- Saved via save dialog, path surfaced as toast

> `dev:export-diagnostics` writes a sanitized JSON bundle (no tokens/keyring material).

---

## Known Bugs

_No known bugs currently tracked._

> Previously tracked, both fixed: dead `notificationSoundEnabled` (now persisted in Rust `Settings` with WebAudio playback) and unreachable AI `style` param (now selectable in ChangesView and passed to `ai:generate-commit-message`).

---

## Statistics

| Category                    | Total  | Done   | Partial | Not started |
| --------------------------- | ------ | ------ | ------- | ----------- |
| Git Operations              | 7      | 5      | 1       | 1           |
| GitHub Integration          | 5      | 1      | 3       | 1           |
| UI/UX Improvements          | 6      | 1      | 3       | 2           |
| AI Features                 | 3      | 0      | 1       | 2           |
| Developer Experience        | 4      | 0      | 1       | 3           |
| Performance & Reliability   | 3      | 2      | 0       | 1           |
| Security & Privacy          | 2      | 0      | 0       | 2           |
| Integration & Extensibility | 4      | 0      | 0       | 4           |
| Polish & Quality of Life    | 6      | 4      | 1       | 1           |
| Recently Added              | 17     | 7      | 4       | 6           |
| **Total**                   | **57** | **20** | **14**  | **23**      |

---

_Last updated: 2026-11-28_
