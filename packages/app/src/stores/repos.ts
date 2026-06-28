import type { StateCreator } from 'zustand';

export interface Repository {
  path: string;
  name: string;
}

export interface ReposSlice {
  repos: Repository[];
  activeRepoPath: string | null;
  setRepos: (repos: Repository[]) => void;
  addRepo: (path: string) => void;
  removeRepo: (path: string) => void;
  setActiveRepo: (path: string | null) => void;
}

export const createReposSlice: StateCreator<ReposSlice> = (set, get) => ({
  repos: [],
  activeRepoPath: null,
  setRepos: (repos) => set({ repos }),
  addRepo: (path) => {
    const name = path.split(/[/\\]/).pop() ?? path;
    const existing = get().repos.find((r) => r.path === path);
    if (existing) {
      set({ activeRepoPath: path });
      return;
    }
    set((state) => ({
      repos: [...state.repos, { path, name }],
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
});
