import { create } from 'zustand';
import { createReposSlice, type ReposSlice } from './repos';
import { createAuthSlice, type AuthSlice } from './auth';
import { createGitOpsSlice, type GitOpsSlice } from './git-ops';
import { createUiSlice, type UiSlice } from './ui';

export type AppStore = ReposSlice & AuthSlice & GitOpsSlice & UiSlice;

export const useAppStore = create<AppStore>()((...args) => ({
  ...createReposSlice(...args),
  ...createAuthSlice(...args),
  ...createGitOpsSlice(...args),
  ...createUiSlice(...args),
}));
