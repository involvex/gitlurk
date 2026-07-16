import { useEffect } from 'react';
import { DiffView, DiffModeEnum } from '@git-diff-view/react';
import '@git-diff-view/react/styles/diff-view.css';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';

export function HistoryPanel() {
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const commitLog = useAppStore((s) => s.commitLog);
  const selectedCommitSha = useAppStore((s) => s.selectedCommitSha);
  const commitDiff = useAppStore((s) => s.commitDiff);
  const commitDiffLoading = useAppStore((s) => s.commitDiffLoading);
  const resolvedTheme = useAppStore((s) => s.resolvedTheme);

  useEffect(() => {
    if (activeRepoPath) {
      void dispatcher.refreshCommitLog();
    }
  }, [activeRepoPath]);

  if (!activeRepoPath) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        <p className="text-sm">Open a repository to view history</p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold">History</h2>
        <p className="text-xs text-muted">Recent commits on this branch</p>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="w-80 shrink-0 overflow-y-auto border-r border-border p-3">
          {commitLog.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted">No commits found</p>
          ) : (
            <ul className="space-y-1">
              {commitLog.map((entry) => (
                <li key={entry.sha}>
                  <button
                    type="button"
                    onClick={() => void dispatcher.loadCommitDiff(entry.sha)}
                    className={`w-full rounded-md px-2 py-2 text-left ${
                      selectedCommitSha === entry.sha
                        ? 'bg-primary/20 text-primary'
                        : 'hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="font-mono text-[10px] text-muted">
                      {entry.graph} {entry.sha.slice(0, 7)}
                    </div>
                    <div className="text-xs font-medium">{entry.subject}</div>
                    <div className="text-[10px] text-muted">
                      {entry.author} · {entry.date}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {!selectedCommitSha ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Select a commit to view its diff
            </div>
          ) : commitDiffLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Loading commit diff…
            </div>
          ) : !commitDiff ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              No diff available
            </div>
          ) : commitDiff.isBinary ? (
            <p className="p-4 text-sm text-muted">Binary changes in commit</p>
          ) : (
            <DiffView
              data={{ hunks: [commitDiff.patch] }}
              diffViewMode={DiffModeEnum.Split}
              diffViewHighlight
              diffViewTheme={resolvedTheme}
            />
          )}
        </div>
      </div>
    </div>
  );
}
