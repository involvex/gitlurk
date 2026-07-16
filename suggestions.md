# GitLurk Desktop — Feature Suggestions

A collection of features that can be implemented to enhance GitLurk Desktop.

---

## Git Operations

### 1. Interactive Staging / Unstaging

**Priority: High** | **Complexity: Medium**

Currently, files are listed as staged/unstaged/untracked but there's no way to stage individual hunks or lines. Add interactive staging support:

- Stage/unstage individual hunks from the diff view
- Stage specific lines (like `git add -p`)
- Discard changes per-file or per-hunk

### 2. Git Stash Support

**Priority: High** | **Complexity: Low**

Add stash operations to the UI:

- `git stash` — stash working changes
- `git stash pop` — apply and remove latest stash
- `git stash list` — show stash entries in a panel
- `git stash drop` — remove a specific stash entry

### 3. Git Rebase / Merge UI

**Priority: High** | **Complexity: Medium**

Provide a visual rebase/merge workflow:

- Select branches to merge or rebase onto
- Show conflict resolution UI with 3-way merge view
- Abort rebase/merge on conflict

### 4. Git Log / History View

**Priority: High** | **Complexity: Medium**

Add a commit history viewer:

- Linear commit log with author, date, message
- Graph view showing branch topology
- Click a commit to view its diff
- Filter by author, date range, or message

### 5. Discard Changes (git checkout / git restore)

**Priority: Medium** | **Complexity: Low**

Allow users to discard unstaged changes:

- Per-file discard with confirmation dialog
- Discard all unstaged changes
- Remove untracked files

### 6. Cherry-Pick Support

**Priority: Medium** | **Complexity: Medium**

Add ability to cherry-pick commits from the history view:

- Select commits from log view
- Cherry-pick with option to auto-commit or stage

### 7. Tag Management

**Priority: Medium** | **Complexity: Low**

Add tag creation and listing:

- Create lightweight or annotated tags
- List existing tags
- Delete tags

---

## GitHub Integration

### 8. Create Pull Request from UI

**Priority: High** | **Complexity: Medium**

Currently PRs are only listed. Add a "Create PR" flow:

- Select source and target branches
- PR title and description editor
- Draft PR option
- Reviewers and labels assignment

### 9. Issue Management

**Priority: High** | **Complexity: Medium**

Add issue tracking integration:

- List issues for the current repo
- Create new issues
- Assign labels, milestones, and assignees
- Close/reopen issues

### 10. GitHub Actions Workflow Viewer

**Priority: High** | **Complexity: Medium**

A dedicated CI/CD panel beyond the current "watch run" feature:

- List all workflows and their recent runs
- Show job/step breakdown with timing
- Re-run failed workflows
- View workflow file content

### 11. Code Review in App

**Priority: High** | **Complexity: High**

Full PR review experience:

- View PR diff
- Add inline comments on code
- Approve / request changes / comment
- View existing review comments

### 12. Fork Management

**Priority: Medium** | **Complexity: Low**

Extend the existing fork feature:

- List user's forks of the current repo
- Sync fork with upstream
- Create PR from fork

---

## UI/UX Improvements

### 13. Keyboard Shortcuts

**Priority: High** | **Complexity: Medium**

Add customizable keyboard shortcuts:

- `Ctrl+Shift+P` — Command palette
- `Ctrl+B` — Toggle sidebar
- `Ctrl+Shift+C` — Quick commit
- `Ctrl+Shift+P` — Quick pull
- `F5` — Refresh status
- `Ctrl+K` — Quick file search

### 14. Command Palette

**Priority: High** | **Complexity: Medium**

A Spotlight-style command palette for quick access:

- Fuzzy search for commands, repos, branches
- Recently used repos
- Quick actions (commit, pull, push, checkout)

### 15. Multi-Repository Workspace

**Priority: High** | **Complexity: Medium**

Support viewing multiple repos simultaneously:

- Tabbed or split-pane view for different repos
- Cross-repo search
- Aggregate status view across repos

### 16. File Tree / Explorer View

**Priority: Medium** | **Complexity: Medium**

Add a file explorer panel:

- Browse repository file tree
- Open files in system editor
- Quick file search by name
- Show file icons based on extension

### 17. Visual Branch Graph

**Priority: Medium** | **Complexity: Medium**

Enhance branch panel with visual graph:

- Show branch relationships visually
- Color-coded branches
- Drag-and-drop merge/rebase

### 18. Dark Mode Improvements

**Priority: Low** | **Complexity: Low**

Enhance the dark/light theme system:

- Custom theme builder
- High contrast mode for accessibility
- Per-repo theme override

---

## AI Features

### 19. AI-Powered Code Review

**Priority: High** | **Complexity: High**

Use AI to review staged changes before commit:

- Suggest improvements
- Detect potential bugs
- Check for security issues

### 20. AI Commit Message Enhancement

**Priority: Medium** | **Complexity: Low**

Extend the existing AI commit feature:

- Support conventional commit format enforcement
- Generate PR descriptions from diff
- Summarize changes across multiple commits

### 21. AI-Powered Git Help

**Priority: Low** | **Complexity: Low**

In-app AI assistant for git commands:

- Explain what a git command does
- Suggest commands based on intent
- Help resolve merge conflicts

---

## Developer Experience

### 22. Git Hooks Management

**Priority: High** | **Complexity: Medium**

Visual management of git hooks:

- List installed hooks (pre-commit, commit-msg, etc.)
- Enable/disable hooks
- Create/edit hook scripts
- Show hook execution logs

### 23. Submodule Management

**Priority: Medium** | **Complexity: Medium**

Submodule operations in the UI:

- Initialize and update submodules
- View submodule status
- Clone with submodules

### 24. Git LFS Support

**Priority: Medium** | **Complexity: Medium**

Large File Storage integration:

- Show LFS tracked files
- Install/uninstall LFS
- Migrate files to/from LFS

### 25. Interactive Git Rebase Editor

**Priority: Medium** | **Complexity: High**

A visual rebase editor:

- Drag-and-drop to reorder commits
- Squash, edit, reword, drop commits
- Preview changes before applying

---

## Performance & Reliability

### 26. Offline Support

**Priority: Medium** | **Complexity: Medium**

Cache data for offline use:

- Cache GitHub notifications and feed
- Show cached data when offline
- Queue operations for when connection returns

### 27. Background Fetch

**Priority: Medium** | **Complexity: Low**

Auto-fetch remote changes:

- Periodic background fetch
- Show notification when new commits available
- Configurable fetch interval

### 28. Repository Watcher

**Priority: Low** | **Complexity: Low**

Watch file system changes:

- Auto-refresh status on file changes
- Debounced updates
- Show file change indicators

---

## Security & Privacy

### 29. GPG Signing Support

**Priority: Medium** | **Complexity: Medium**

Sign commits and tags with GPG keys:

- Detect available GPG keys
- Sign commits automatically
- Verify signatures on incoming commits

### 30. Secret Scanning

**Priority: Medium** | **Complexity: Medium**

Scan for accidentally committed secrets:

- Detect API keys, tokens, passwords
- Pre-commit hook integration
- Show warnings before commit

---

## Integration & Extensibility

### 31. Custom Webhook Support

**Priority: Low** | **Complexity: Medium**

Configure webhooks for repo events:

- Send notifications to Slack, Discord, etc.
- Custom webhook URLs
- Event filtering

### 32. Git Worktree Support

**Priority: Medium** | **Complexity: Medium**

Manage git worktrees:

- Create worktrees from branches
- List active worktrees
- Remove worktrees

### 33. External Diff Tool Integration

**Priority: Low** | **Complexity: Low**

Launch external diff tools:

- Configure custom diff tool (Beyond Compare, VS Code, etc.)
- Configure custom merge tool
- Open in external editor

### 34. SSH Key Management

**Priority: Low** | **Complexity: Medium**

Manage SSH keys within the app:

- Generate new SSH keys
- View existing keys
- Add keys to SSH agent
- Copy public key to clipboard

---

## Polish & Quality of Life

### 35. Search Across Repos

**Priority: Medium** | **Complexity: Medium**

Global search functionality:

- Search across all open repos
- Full-text code search
- File name search
- Commit message search

### 36. Recent Repositories

**Priority: Low** | **Complexity: Low**

Quick access to recently opened repos:

- Recently used list in sidebar
- Pinned/favorite repos
- Search recent repos

### 37. Notification Improvements

**Priority: Medium** | **Complexity: Low**

Enhance the notification system:

- System tray notifications for new PRs/reviews
- Custom notification sounds
- Notification preferences per repo

### 38. Export/Import Settings

**Priority: Low** | **Complexity: Low**

Backup and restore configuration:

- Export settings to JSON
- Import settings from file
- Sync settings across devices

### 39. Changelog / What's New Panel

**Priority: Low** | **Complexity: Low**

Show release notes in-app:

- Display changelog on update
- Link to full release notes
- Mark items as read

### 40. Onboarding Flow

**Priority: Medium** | **Complexity: Low**

First-run experience:

- Welcome screen with feature tour
- Initial setup wizard (sign in, select default shell)
- Quick start guide

---

## Statistics

| Category                    | Count  |
| --------------------------- | ------ |
| Git Operations              | 7      |
| GitHub Integration          | 5      |
| UI/UX Improvements          | 6      |
| AI Features                 | 3      |
| Developer Experience        | 4      |
| Performance & Reliability   | 3      |
| Security & Privacy          | 2      |
| Integration & Extensibility | 4      |
| Polish & Quality of Life    | 6      |
| **Total**                   | **40** |

---

_Last updated: 2026-07-16_
