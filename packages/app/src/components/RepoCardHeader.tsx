import type { Repository } from '../stores/repos';

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never updated';
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return 'Just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `Updated ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

export function RepoCardHeader({
  repo,
  expanded,
  onToggle,
  onRefresh,
  onOpen,
}: {
  repo: Repository;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onOpen: () => void;
}) {
  const ahead = repo.aheadCount;
  const behind = repo.behindCount;

  return (
    <div className="flex items-start gap-2 p-3">
      <button
        type="button"
        onClick={onToggle}
        className="mt-0.5 rounded px-1 text-xs text-muted hover:bg-surface hover:text-foreground"
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse' : 'Expand'}
      >
        {expanded ? '▾' : '▸'}
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          className="truncate text-left text-sm font-semibold text-foreground hover:text-primary"
          title={repo.path}
        >
          {repo.name}
          {repo.pinned ? (
            <span className="ml-1 text-xs text-muted" title="Pinned">
              ★
            </span>
          ) : null}
        </button>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          {ahead !== null || behind !== null ? (
            <>
              <span
                className={`rounded px-1.5 py-0.5 ${
                  (ahead ?? 0) > 0
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface text-muted'
                }`}
              >
                ↑{ahead ?? 0}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 ${
                  (behind ?? 0) > 0
                    ? 'bg-danger/15 text-danger'
                    : 'bg-surface text-muted'
                }`}
              >
                ↓{behind ?? 0}
              </span>
            </>
          ) : (
            <span className="text-muted">No upstream</span>
          )}
          {repo.dirty ? (
            <span className="rounded bg-accent/15 px-1.5 py-0.5 text-accent">
              dirty
            </span>
          ) : null}
          {repo.isFetching ? (
            <span className="text-muted">Updating…</span>
          ) : (
            <span className="text-muted">
              {relativeTime(repo.lastFetchedAt)}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={repo.isFetching}
        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface disabled:opacity-50"
        title="Refresh"
      >
        ↻
      </button>
    </div>
  );
}
