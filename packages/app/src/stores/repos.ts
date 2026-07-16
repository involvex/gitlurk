import type { StateCreator } from 'zustand';

export interface Repository {
  path: string;
  name: string;
  pinned: boolean;
  lastOpenedAt: string | null;
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
  sortedRepos: () => Repository[];
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
      repos: [...state.repos, { path, name, pinned: false, lastOpenedAt: now }],
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
