import type { StateCreator } from 'zustand';

export interface RepoCiRun {
  id: string;
  status: string;
  conclusion?: string | null;
  workflow: string;
  title?: string;
  createdAt: string;
  url: string;
}

export interface Repository {
  path: string;
  name: string;
  pinned: boolean;
  lastOpenedAt: string | null;
  aheadCount: number | null;
  behindCount: number | null;
  lastFetchedAt: string | null;
  ciRuns: RepoCiRun[];
  isFetching: boolean;
  currentBranch?: string | null;
  upstreamBranch?: string | null;
  dirty?: boolean;
}

export interface ReposSlice {
  repos: Repository[];
  activeRepoPath: string | null;
  setRepos: (repos: Repository[]) => void;
  addRepo: (path: string) => void;
  removeRepo: (path: string) => void;
  setActiveRepo: (path: string | null) => void;
  toggleRepoPin: (path: string) => void;
  touchRepo: (path: string) => void;
  updateRepoMetrics: (
    path: string,
    metrics: Partial<
      Pick<
        Repository,
        | 'aheadCount'
        | 'behindCount'
        | 'lastFetchedAt'
        | 'ciRuns'
        | 'isFetching'
        | 'currentBranch'
        | 'upstreamBranch'
        | 'dirty'
      >
    >,
  ) => void;
  sortedRepos: () => Repository[];
}

function emptyMetrics(): Pick<
  Repository,
  | 'aheadCount'
  | 'behindCount'
  | 'lastFetchedAt'
  | 'ciRuns'
  | 'isFetching'
  | 'currentBranch'
  | 'upstreamBranch'
  | 'dirty'
> {
  return {
    aheadCount: null,
    behindCount: null,
    lastFetchedAt: null,
    ciRuns: [],
    isFetching: false,
    currentBranch: null,
    upstreamBranch: null,
    dirty: false,
  };
}

export const createReposSlice: StateCreator<ReposSlice> = (set, get) => ({
  repos: [],
  activeRepoPath: null,
  setRepos: (repos) => set({ repos }),
  addRepo: (path) => {
    const name = path.split(/[/\\]/).pop() ?? path;
    const now = new Date().toISOString();
    const existing = get().repos.find((r) => r.path === path);
    if (existing) {
      set({
        activeRepoPath: path,
        repos: get().repos.map((r) =>
          r.path === path ? { ...r, lastOpenedAt: now } : r,
        ),
      });
      return;
    }
    set((state) => ({
      repos: [
        ...state.repos,
        {
          path,
          name,
          pinned: false,
          lastOpenedAt: now,
          ...emptyMetrics(),
        },
      ],
      activeRepoPath: path,
    }));
  },
  removeRepo: (path) =>
    set((state) => ({
      repos: state.repos.filter((r) => r.path !== path),
      activeRepoPath:
        state.activeRepoPath === path ? null : state.activeRepoPath,
    })),
  setActiveRepo: (path) => set({ activeRepoPath: path }),
  toggleRepoPin: (path) =>
    set((state) => ({
      repos: state.repos.map((r) =>
        r.path === path ? { ...r, pinned: !r.pinned } : r,
      ),
    })),
  touchRepo: (path) => {
    const now = new Date().toISOString();
    set((state) => ({
      repos: state.repos.map((r) =>
        r.path === path ? { ...r, lastOpenedAt: now } : r,
      ),
    }));
  },
  updateRepoMetrics: (path, metrics) =>
    set((state) => ({
      repos: state.repos.map((r) =>
        r.path === path ? { ...r, ...metrics } : r,
      ),
    })),
  sortedRepos: () => {
    const repos = [...get().repos];
    repos.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const aTime = a.lastOpenedAt ? Date.parse(a.lastOpenedAt) : 0;
      const bTime = b.lastOpenedAt ? Date.parse(b.lastOpenedAt) : 0;
      return bTime - aTime;
    });
    return repos;
  },
});
