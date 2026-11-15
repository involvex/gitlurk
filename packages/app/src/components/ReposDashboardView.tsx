import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';
import { RepoCard } from './RepoCard';

export function ReposDashboardView() {
  const repos = useAppStore((s) => s.repos);
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (useAppStore.getState().repos.length === 0) return;
    void dispatcher.refreshAllRepos();
  }, []);
  const sorted = useMemo(() => {
    const copy = [...repos];
    copy.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const aBehind = a.behindCount ?? 0;
      const bBehind = b.behindCount ?? 0;
      if (aBehind !== bBehind) return bBehind - aBehind;
      const aAhead = a.aheadCount ?? 0;
      const bAhead = b.aheadCount ?? 0;
      if (aAhead !== bAhead) return bAhead - aAhead;
      const aTime = a.lastOpenedAt ? Date.parse(a.lastOpenedAt) : 0;
      const bTime = b.lastOpenedAt ? Date.parse(b.lastOpenedAt) : 0;
      return bTime - aTime;
    });
    return copy;
  }, [repos]);

  const fetching = repos.some((r) => r.isFetching);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">Repos Dashboard</h2>
          <p className="text-xs text-muted">
            Ahead/behind status and recent CI across your repositories
          </p>
        </div>
        <button
          type="button"
          onClick={() => void dispatcher.refreshAllRepos()}
          disabled={fetching || repos.length === 0}
          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated disabled:opacity-50"
        >
          {fetching ? 'Refreshing…' : 'Refresh all'}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {repos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-foreground">No repositories yet</p>
            <p className="mt-1 text-xs text-muted">
              Open or clone a repository to see it here.
            </p>
            <button
              type="button"
              onClick={() => void dispatcher.openLocalRepo()}
              className="mt-4 rounded-md bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover"
            >
              Open repository
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {sorted.map((repo) => (
              <RepoCard key={repo.path} repo={repo} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
