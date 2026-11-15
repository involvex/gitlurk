import type { RepoCiRun } from '../stores/repos';
import { dispatcher } from '../dispatcher';

function statusBadge(run: RepoCiRun): string {
  if (run.status === 'completed') {
    if (run.conclusion === 'success') return '✓';
    if (run.conclusion === 'failure') return '✗';
    return run.conclusion ?? '•';
  }
  if (run.status === 'in_progress' || run.status === 'queued') return '…';
  return '•';
}

function statusClass(run: RepoCiRun): string {
  if (run.conclusion === 'success') return 'text-accent';
  if (run.conclusion === 'failure') return 'text-danger';
  if (run.status === 'in_progress' || run.status === 'queued') {
    return 'text-primary';
  }
  return 'text-muted';
}

export function CiRunsList({ runs }: { runs: RepoCiRun[] }) {
  if (runs.length === 0) {
    return (
      <p className="text-xs text-muted">
        No CI runs (sign in and push to GitHub to see Actions).
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {runs.map((run) => (
        <li key={run.id}>
          <button
            type="button"
            onClick={() => void dispatcher.openExternal(run.url)}
            className="flex w-full items-start gap-2 rounded border border-border px-2 py-1 text-left text-xs hover:bg-surface"
          >
            <span className={`font-mono ${statusClass(run)}`}>
              {statusBadge(run)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-foreground">
                {run.workflow}
                {run.title ? ` — ${run.title}` : ''}
              </span>
              <span className="text-muted">
                {run.status}
                {run.conclusion ? ` / ${run.conclusion}` : ''} ·{' '}
                {new Date(run.createdAt).toLocaleString()}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
