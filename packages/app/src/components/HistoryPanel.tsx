import { useEffect, useMemo, useState } from 'react';
import { DiffView, DiffModeEnum } from '@git-diff-view/react';
import '@git-diff-view/react/styles/diff-view.css';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';
import { ConfirmDialog } from './ConfirmDialog';
import { CommitGraphRow } from './CommitGraphRow';
import { layoutCommitGraph, maxGraphColumns } from '../lib/graph-layout';

export function HistoryPanel() {
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const commitLog = useAppStore((s) => s.commitLog);
  const selectedCommitSha = useAppStore((s) => s.selectedCommitSha);
  const commitDiff = useAppStore((s) => s.commitDiff);
  const commitDiffLoading = useAppStore((s) => s.commitDiffLoading);
  const resolvedTheme = useAppStore((s) => s.resolvedTheme);
  const [filter, setFilter] = useState('');
  const [pendingCherryPickSha, setPendingCherryPickSha] = useState<
    string | null
  >(null);

  useEffect(() => {
    setFilter('');
    if (activeRepoPath) {
      void dispatcher.refreshCommitLog();
    }
  }, [activeRepoPath]);

  const visibleLog = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return commitLog;
    return commitLog.filter(
      (entry) =>
        entry.subject.toLowerCase().includes(query) ||
        entry.author.toLowerCase().includes(query) ||
        entry.date.toLowerCase().includes(query) ||
        entry.sha.toLowerCase().includes(query),
    );
  }, [commitLog, filter]);

  const graphLayouts = useMemo(
    () => layoutCommitGraph(visibleLog),
    [visibleLog],
  );
  const graphMaxChars = useMemo(
    () => maxGraphColumns(visibleLog),
    [visibleLog],
  );

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
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setFilter('');
            }}
            placeholder="Filter by message, author, date…"
            className="mb-2 w-full rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-primary"
          />
          {commitLog.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted">No commits found</p>
          ) : visibleLog.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted">
              No commits match your filter.
            </p>
          ) : (
            <ul className="space-y-1">
              {visibleLog.map((entry, index) => (
                <li key={entry.sha}>
                  <button
                    type="button"
                    onClick={() => void dispatcher.loadCommitDiff(entry.sha)}
                    className={`flex w-full items-start gap-1.5 rounded-md px-2 py-2 text-left ${
                      selectedCommitSha === entry.sha
                        ? 'bg-primary/20 text-primary'
                        : 'hover:bg-surface-elevated'
                    }`}
                  >
                    <CommitGraphRow
                      layout={graphLayouts[index]}
                      maxChars={graphMaxChars}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[10px] text-muted">
                        {entry.sha.slice(0, 7)}
                      </span>
                      <span className="block truncate text-xs font-medium">
                        {entry.subject}
                      </span>
                      <span className="block text-[10px] text-muted">
                        {entry.author} · {entry.date}
                      </span>
                    </span>
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
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-border bg-surface-elevated px-3 py-1.5">
                <span className="font-mono text-xs text-muted">
                  Commit {selectedCommitSha.slice(0, 7)}
                </span>
                <button
                  type="button"
                  onClick={() => setPendingCherryPickSha(selectedCommitSha)}
                  disabled={commitDiffLoading || !commitDiff}
                  title="Copy this commit onto the current branch"
                  className="rounded border border-border px-2 py-0.5 text-[10px] hover:bg-surface disabled:opacity-50"
                >
                  Cherry-pick
                </button>
              </div>
              {commitDiffLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted">
                  Loading commit diff…
                </div>
              ) : !commitDiff ? (
                <div className="flex h-full items-center justify-center text-sm text-muted">
                  No diff available
                </div>
              ) : commitDiff.isBinary ? (
                <p className="p-4 text-sm text-muted">
                  Binary changes in commit
                </p>
              ) : (
                <DiffView
                  data={{ hunks: [commitDiff.patch] }}
                  diffViewMode={DiffModeEnum.Split}
                  diffViewHighlight
                  diffViewTheme={resolvedTheme}
                />
              )}
            </>
          )}
        </div>
      </div>

      {pendingCherryPickSha ? (
        <ConfirmDialog
          title="Cherry-pick this commit?"
          message={`Apply ${pendingCherryPickSha.slice(0, 7)} onto ${useAppStore.getState().currentBranch || 'the current branch'}? Conflicts will need manual resolution.`}
          confirmLabel="Cherry-pick"
          onCancel={() => setPendingCherryPickSha(null)}
          onConfirm={() => {
            void dispatcher.cherryPick(pendingCherryPickSha);
            setPendingCherryPickSha(null);
          }}
        />
      ) : null}
    </div>
  );
}
