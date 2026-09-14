# Repos Dashboard Implementation Plan (#50)

## Overview
Create a dashboard view showing all repositories with ahead/behind counts, CI status, and quick actions. Expandable cards with commit list, CI runs, and branch status.

## Requirements (from user)
- Compute behind count from local vs remote tracking branch
- Both cached (background) + manual refresh
- Expandable cards showing:
  - Commit list (ahead/behind)
  - CI runs (from GitHub)
  - Branch status
- Priority: after .gitignore editor

## Architecture

### Data Flow
```
Background fetch (15min interval) → Rust: git_remote_ahead + gh run list
                                    → Store in repos.json with timestamp
Manual refresh button → Same calls, immediate UI update
Dashboard view → Read from store, show expandable cards
```

### New IPC Channels
| Channel | Payload | Response |
|---------|---------|----------|
| `git:remote-ahead` | `{ path: string }` | `{ ahead: number \| null, behind: number \| null }` |
| `github:list-runs` | `{ owner: string, repo: string, limit?: number }` | `{ runs: Array<Run> }` |
| `app:refresh-repo` | `{ path: string }` | `{ ahead: number, behind: number, runs: Run[] }` |

### Store Extensions (repos.ts)
```typescript
interface RepoEntry {
  path: string;
  name: string;
  pinned: boolean;
  lastOpenedAt: string | null;
  // NEW
  aheadCount: number | null;
  behindCount: number | null;
  lastFetchedAt: string | null;
  ciRuns: CiRun[];
  isFetching: boolean;
}
```

### Components
1. **ReposDashboardView.tsx** - Main dashboard (replaces Overview when in workspace mode with no selection)
2. **RepoCard.tsx** - Expandable card per repo
3. **RepoCardHeader.tsx** - Name, ahead/behind badges, refresh button
4. **RepoCardBody.tsx** - Commits, CI runs, branches tabs
5. **CommitList.tsx** - Shows ahead commits (local not pushed) + behind commits (remote not pulled)
6. **CiRunsList.tsx** - Recent workflow runs with status badges
7. **BranchStatus.tsx** - Current branch, tracking branch, status

## Implementation Phases

### Phase 1: Rust Backend (Week 1)
- [ ] Add `git:remote-ahead` command returning `{ ahead, behind }` 
- [ ] Add `github:list-runs` command wrapping `gh run list`
- [ ] Add `app:refresh-repo` composite command
- [ ] Update `RepoWatcher` to emit `repo-changed` with ahead/behind

### Phase 2: Store & IPC (Week 1)
- [ ] Add channels to `packages/shared/src/ipc/channels.ts`
- [ ] Extend `ReposSlice` in `packages/app/src/stores/repos.ts`
- [ ] Add `refreshRepo(path)`, `refreshAllRepos()` to dispatcher
- [ ] Background fetch: use existing `backgroundFetchEnabled` + `backgroundFetchIntervalMin`

### Phase 3: UI Components (Week 2)
- [ ] `ReposDashboardView.tsx` - grid of RepoCards
- [ ] `RepoCard.tsx` - expandable with chevron
- [ ] `CommitList.tsx` - uses `git:log` with `--oneline @{u}..HEAD` (ahead) and `HEAD..@{u}` (behind)
- [ ] `CiRunsList.tsx` - status badges (success/failure/running), link to GitHub
- [ ] `BranchStatus.tsx` - current branch, upstream, dirty indicator

### Phase 4: Integration (Week 2)
- [ ] Add "Dashboard" tab to workspace tabs (Overview | Changes | History | **Dashboard**)
- [ ] Wire manual refresh button (per card + global)
- [ ] Add to Sidebar: "Open Dashboard" action
- [ ] Command Palette: "Show Repos Dashboard"

### Phase 5: Polish (Week 2)
- [ ] Loading skeletons for cards
- [ ] Empty states (no repos, no CI runs)
- [ ] Error handling (no GitHub remote, auth expired)
- [ ] Keyboard navigation between cards
- [ ] Persist expanded state per repo

## Technical Details

### Computing Ahead/Behind
```bash
# Ahead (local commits not pushed)
git rev-list --count @{u}..HEAD

# Behind (remote commits not pulled)  
git rev-list --count HEAD..@{u}
```

Handle cases:
- No upstream branch → null
- Detached HEAD → null
- No remote → null

### CI Runs from GitHub
```bash
gh run list --repo owner/repo --limit 5 --json status,conclusion,workflowName,createdAt,url
```

### Background Fetch Strategy
- Reuse existing `RepoWatcher` infrastructure
- On interval: for each repo with GitHub remote, call `app:refresh-repo`
- Debounce: max 1 concurrent, 2s between repos
- Store results in repos.json with `lastFetchedAt`

### Caching
- Repos.json stores: `aheadCount`, `behindCount`, `ciRuns`, `lastFetchedAt`
- UI shows stale data immediately, updates when fetch completes
- Staleness indicator: "Updated 5 min ago" / "Updating..."

## File Structure
```
packages/app/src/
├── components/
│   ├── ReposDashboardView.tsx      # Main view
│   ├── RepoCard.tsx                # Expandable card
│   ├── RepoCardHeader.tsx          # Header with badges
│   ├── RepoCardBody.tsx            # Expandable content
│   ├── CommitList.tsx              # Ahead/behind commits
│   ├── CiRunsList.tsx              # CI run list
│   └── BranchStatus.tsx            # Branch info
├── stores/
│   └── repos.ts                    # Extended with ahead/behind/ciRuns
├── dispatcher/
│   └── index.ts                    # refreshRepo, refreshAllRepos
```

## Acceptance Criteria
- [ ] Dashboard shows all repos in grid
- [ ] Each card shows ahead/behind badges (e.g., "↑3 ↓1")
- [ ] Click card expands to show commits + CI runs + branches
- [ ] Manual refresh button per card works
- [ ] Background fetch runs every 15 min (configurable)
- [ ] Stale data shown while fetching
- [ ] Handles repos without GitHub remote gracefully
- [ ] Handles auth expired gracefully
- [ ] Keyboard accessible (Tab, Enter, Arrow keys)

## Dependencies
- Requires GitHub auth for CI runs (device flow already implemented)
- Requires git upstream branch configured for ahead/behind
- Uses existing `backgroundFetchEnabled` setting

## Testing
- Unit: store selectors, ahead/behind computation
- Integration: mock git/gh commands, verify store updates
- E2E: add repo, push commits, verify ahead count updates