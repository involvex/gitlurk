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
  graphExtra?: string[];
}

export interface StashEntry {
  index: number;
  message: string;
}

export interface TagEntry {
  name: string;
  message?: string;
}

export interface GitignoreTemplate {
  id: string;
  name: string;
  content: string;
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
  diffIgnoreWhitespace: boolean;
  stashes: StashEntry[];
  tags: TagEntry[];
  commitLog: CommitLogEntry[];
  selectedCommitSha: string | null;
  commitDiff: FileDiff | null;
  commitDiffLoading: boolean;
  // Gitignore Editor
  gitignoreTemplates: GitignoreTemplate[];
  gitignoreTemplatesLoading: boolean;
  gitignoreEditorContent: string;
  gitignoreEditorPath: string | null;
  showGitignoreEditor: boolean;
  setStatus: (status: GitStatus | null) => void;
  setBranches: (branches: string[], current: string) => void;
  setPulls: (pulls: PullRequest[]) => void;
  setGitOpLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCommitMessage: (message: string) => void;
  setSelectedFile: (file: string | null, kind: DiffKind | null) => void;
  setFileDiff: (diff: FileDiff | null) => void;
  setDiffLoading: (loading: boolean) => void;
  setDiffIgnoreWhitespace: (ignore: boolean) => void;
  setStashes: (stashes: StashEntry[]) => void;
  setTags: (tags: TagEntry[]) => void;
  setCommitLog: (commitLog: CommitLogEntry[]) => void;
  setSelectedCommitSha: (sha: string | null) => void;
  setCommitDiff: (diff: FileDiff | null) => void;
  setCommitDiffLoading: (commitDiffLoading: boolean) => void;
  // Gitignore Editor actions
  setGitignoreTemplates: (templates: GitignoreTemplate[]) => void;
  setGitignoreTemplatesLoading: (loading: boolean) => void;
  setGitignoreEditorContent: (content: string) => void;
  setGitignoreEditorPath: (path: string | null) => void;
  setShowGitignoreEditor: (show: boolean) => void;
  openGitignoreEditor: (repoPath: string, initialContent?: string) => void;
  closeGitignoreEditor: () => void;
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
  diffIgnoreWhitespace: false,
  stashes: [],
  tags: [],
  commitLog: [],
  selectedCommitSha: null,
  commitDiff: null,
  commitDiffLoading: false,
  // Gitignore Editor
  gitignoreTemplates: [],
  gitignoreTemplatesLoading: false,
  gitignoreEditorContent: '',
  gitignoreEditorPath: null,
  showGitignoreEditor: false,
  setStatus: (status) => set({ status }),
  setBranches: (branches, current) => set({ branches, currentBranch: current }),
  setPulls: (pulls) => set({ pulls }),
  setGitOpLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setCommitMessage: (message) => set({ commitMessage: message }),
  setSelectedFile: (file, kind) => set({ selectedFile: file, diffKind: kind }),
  setFileDiff: (diff) => set({ fileDiff: diff }),
  setDiffLoading: (loading) => set({ diffLoading: loading }),
  setDiffIgnoreWhitespace: (diffIgnoreWhitespace) =>
    set({ diffIgnoreWhitespace }),
  setStashes: (stashes) => set({ stashes }),
  setTags: (tags) => set({ tags }),
  setCommitLog: (commitLog) => set({ commitLog }),
  setSelectedCommitSha: (selectedCommitSha) => set({ selectedCommitSha }),
  setCommitDiff: (commitDiff) => set({ commitDiff }),
  setCommitDiffLoading: (commitDiffLoading) => set({ commitDiffLoading }),
  // Gitignore Editor actions
  setGitignoreTemplates: (templates) => set({ gitignoreTemplates: templates }),
  setGitignoreTemplatesLoading: (loading) =>
    set({ gitignoreTemplatesLoading: loading }),
  setGitignoreEditorContent: (content) =>
    set({ gitignoreEditorContent: content }),
  setGitignoreEditorPath: (path) => set({ gitignoreEditorPath: path }),
  setShowGitignoreEditor: (show) => set({ showGitignoreEditor: show }),
  openGitignoreEditor: (repoPath, initialContent = '') =>
    set({
      gitignoreEditorPath: repoPath,
      gitignoreEditorContent: initialContent,
      showGitignoreEditor: true,
    }),
  closeGitignoreEditor: () =>
    set({
      gitignoreEditorPath: null,
      gitignoreEditorContent: '',
      showGitignoreEditor: false,
    }),
});
