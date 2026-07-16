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

export type DiffKind = 'staged' | 'unstaged' | 'untracked';

export interface FileDiff {
  patch: string;
  isBinary: boolean;
}

export interface CommitLogEntry {
  sha: string;
  subject: string;
  author: string;
  date: string;
  graph: string;
}

export interface StashEntry {
  index: number;
  message: string;
}

export interface GitOpsSlice {
  status: GitStatus | null;
  branches: string[];
  currentBranch: string;
  pulls: PullRequest[];
  loading: boolean;
  error: string | null;
  commitMessage: string;
  selectedFile: string | null;
  diffKind: DiffKind | null;
  fileDiff: FileDiff | null;
  diffLoading: boolean;
  stashes: StashEntry[];
  commitLog: CommitLogEntry[];
  selectedCommitSha: string | null;
  commitDiff: FileDiff | null;
  commitDiffLoading: boolean;
  setStatus: (status: GitStatus | null) => void;
  setBranches: (branches: string[], current: string) => void;
  setPulls: (pulls: PullRequest[]) => void;
  setGitOpLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCommitMessage: (message: string) => void;
  setSelectedFile: (file: string | null, kind: DiffKind | null) => void;
  setFileDiff: (diff: FileDiff | null) => void;
  setDiffLoading: (loading: boolean) => void;
  setStashes: (stashes: StashEntry[]) => void;
  setCommitLog: (entries: CommitLogEntry[]) => void;
  setSelectedCommitSha: (sha: string | null) => void;
  setCommitDiff: (diff: FileDiff | null) => void;
  setCommitDiffLoading: (loading: boolean) => void;
}

export const createGitOpsSlice: StateCreator<GitOpsSlice> = (set) => ({
  status: null,
  branches: [],
  currentBranch: '',
  pulls: [],
  loading: false,
  error: null,
  commitMessage: '',
  selectedFile: null,
  diffKind: null,
  fileDiff: null,
  diffLoading: false,
  stashes: [],
  commitLog: [],
  selectedCommitSha: null,
  commitDiff: null,
  commitDiffLoading: false,
  setStatus: (status) => set({ status }),
  setBranches: (branches, current) => set({ branches, currentBranch: current }),
  setPulls: (pulls) => set({ pulls }),
  setGitOpLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setCommitMessage: (message) => set({ commitMessage: message }),
  setSelectedFile: (file, kind) => set({ selectedFile: file, diffKind: kind }),
  setFileDiff: (diff) => set({ fileDiff: diff }),
  setDiffLoading: (loading) => set({ diffLoading: loading }),
  setStashes: (stashes) => set({ stashes }),
  setCommitLog: (commitLog) => set({ commitLog }),
  setSelectedCommitSha: (selectedCommitSha) => set({ selectedCommitSha }),
  setCommitDiff: (commitDiff) => set({ commitDiff }),
  setCommitDiffLoading: (commitDiffLoading) => set({ commitDiffLoading }),
});
