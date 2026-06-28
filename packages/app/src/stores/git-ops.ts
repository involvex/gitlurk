import type { StateCreator } from 'zustand';

export interface GitStatus {
  staged: string[];
  unstaged: string[];
  untracked: string[];
  branch: string;
}

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  state: string;
  user: string;
}

export interface GitOpsSlice {
  status: GitStatus | null;
  branches: string[];
  currentBranch: string;
  pulls: PullRequest[];
  loading: boolean;
  error: string | null;
  commitMessage: string;
  setStatus: (status: GitStatus | null) => void;
  setBranches: (branches: string[], current: string) => void;
  setPulls: (pulls: PullRequest[]) => void;
  setGitOpLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCommitMessage: (message: string) => void;
}

export const createGitOpsSlice: StateCreator<GitOpsSlice> = (set) => ({
  status: null,
  branches: [],
  currentBranch: '',
  pulls: [],
  loading: false,
  error: null,
  commitMessage: '',
  setStatus: (status) => set({ status }),
  setBranches: (branches, current) => set({ branches, currentBranch: current }),
  setPulls: (pulls) => set({ pulls }),
  setGitOpLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setCommitMessage: (message) => set({ commitMessage: message }),
});
