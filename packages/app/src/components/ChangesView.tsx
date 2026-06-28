import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';

function FileList({
  title,
  files,
  emptyText,
}: {
  title: string;
  files: string[];
  emptyText: string;
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
            <li key={file} className="px-4 py-2 font-mono text-xs">
              {file}
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

  if (!activeRepoPath) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        <div className="text-center">
          <p className="text-lg font-medium">Welcome to MyGit Desktop</p>
          <p className="mt-2 text-sm">
            Open a local repository or clone from GitHub to begin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
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

      <div className="grid flex-1 gap-4 overflow-y-auto p-6 lg:grid-cols-2">
        <FileList
          title="Staged changes"
          files={status?.staged ?? []}
          emptyText="No staged changes"
        />
        <FileList
          title="Unstaged changes"
          files={status?.unstaged ?? []}
          emptyText="No unstaged changes"
        />
        <FileList
          title="Untracked files"
          files={status?.untracked ?? []}
          emptyText="No untracked files"
        />
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
        <button
          type="button"
          onClick={() => void dispatcher.commit()}
          disabled={loading || !commitMessage.trim()}
          className="rounded-md bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
        >
          Commit to {currentBranch || status?.branch || 'branch'}
        </button>
      </footer>
    </div>
  );
}
