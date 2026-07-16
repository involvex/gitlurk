import { useState } from 'react';
import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';
import type { DiffKind } from '../stores/git-ops';
import { DiffPanel } from './DiffPanel';
import { ResizeHandle } from './ResizeHandle';

function FileList({
  title,
  files,
  emptyText,
  kind,
  selectedFile,
  onSelect,
}: {
  title: string;
  files: string[];
  emptyText: string;
  kind: DiffKind;
  selectedFile: string | null;
  onSelect: (file: string, kind: DiffKind) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface-elevated">
      <header className="border-b border-border px-4 py-2">
        <h3 className="text-sm font-medium">{title}</h3>
      </header>
      {files.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-border">
          {files.map((file) => (
            <li key={file}>
              <button
                type="button"
                onClick={() => onSelect(file, kind)}
                className={`w-full px-4 py-2 text-left font-mono text-xs ${
                  selectedFile === file
                    ? 'bg-primary/20 text-primary'
                    : 'hover:bg-surface'
                }`}
              >
                {file}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ChangesView() {
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const status = useAppStore((s) => s.status);
  const loading = useAppStore((s) => s.loading);
  const error = useAppStore((s) => s.error);
  const commitMessage = useAppStore((s) => s.commitMessage);
  const currentBranch = useAppStore((s) => s.currentBranch);
  const selectedFile = useAppStore((s) => s.selectedFile);
  const fileListWidth = useAppStore((s) => s.fileListWidth);
  const [aiLoading, setAiLoading] = useState(false);

  if (!activeRepoPath) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        <div className="text-center">
          <p className="text-lg font-medium">Welcome to GitLurk Desktop</p>
          <p className="mt-2 text-sm">
            Open a local repository or clone from GitHub to begin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Changes</h2>
          <p className="text-xs text-muted">
            Branch: {currentBranch || status?.branch || 'unknown'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void dispatcher.refreshStatus()}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void dispatcher.pull()}
            disabled={loading}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated disabled:opacity-50"
          >
            Pull
          </button>
          <button
            type="button"
            onClick={() => void dispatcher.push()}
            disabled={loading}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated disabled:opacity-50"
          >
            Push
          </button>
          <button
            type="button"
            onClick={() => void dispatcher.openTerminal()}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated"
          >
            Terminal
          </button>
        </div>
      </header>

      {error ? (
        <div className="mx-6 mt-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
          <button
            type="button"
            onClick={() => useAppStore.getState().setError(null)}
            className="ml-3 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div
          className="space-y-4 overflow-y-auto border-r border-border p-4"
          style={{ width: fileListWidth }}
        >
          <FileList
            title="Staged changes"
            files={status?.staged ?? []}
            emptyText="No staged changes"
            kind="staged"
            selectedFile={selectedFile}
            onSelect={(file, kind) => void dispatcher.loadFileDiff(file, kind)}
          />
          <FileList
            title="Unstaged changes"
            files={status?.unstaged ?? []}
            emptyText="No unstaged changes"
            kind="unstaged"
            selectedFile={selectedFile}
            onSelect={(file, kind) => void dispatcher.loadFileDiff(file, kind)}
          />
          <FileList
            title="Untracked files"
            files={status?.untracked ?? []}
            emptyText="No untracked files"
            kind="untracked"
            selectedFile={selectedFile}
            onSelect={(file, kind) => void dispatcher.loadFileDiff(file, kind)}
          />
        </div>
        <ResizeHandle
          orientation="vertical"
          onDrag={(delta) => dispatcher.resizeFileList(delta)}
        />
        <DiffPanel />
      </div>

      <footer className="border-t border-border p-6">
        <label className="mb-2 block text-xs font-medium text-muted">
          Commit summary
        </label>
        <textarea
          value={commitMessage}
          onChange={(e) =>
            useAppStore.getState().setCommitMessage(e.target.value)
          }
          placeholder="Describe your changes"
          className="mb-3 h-20 w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={aiLoading || loading}
            onClick={() => {
              setAiLoading(true);
              void dispatcher
                .generateCommitMessage()
                .finally(() => setAiLoading(false));
            }}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-elevated disabled:opacity-50"
          >
            {aiLoading ? 'Generating…' : 'Generate with AI'}
          </button>
          <button
            type="button"
            onClick={() => void dispatcher.commit()}
            disabled={loading || !commitMessage.trim()}
            className="rounded-md bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Commit to {currentBranch || status?.branch || 'branch'}
          </button>
        </div>
      </footer>
    </div>
  );
}
