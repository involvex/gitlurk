import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';

export function PullRequestPanel() {
  const pulls = useAppStore((s) => s.pulls);
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);

  if (!activeRepoPath) return null;

  return (
    <section className="border-t border-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Pull Requests</h3>
        <button
          type="button"
          onClick={() => void dispatcher.refreshPullRequests()}
          className="text-xs text-primary hover:underline"
        >
          Refresh
        </button>
      </div>
      {pulls.length === 0 ? (
        <p className="text-xs text-muted">No open pull requests</p>
      ) : (
        <ul className="space-y-2">
          {pulls.map((pr) => (
            <li key={pr.number}>
              <a
                href={pr.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-md border border-border px-3 py-2 text-xs hover:bg-surface"
              >
                <span className="font-medium text-primary">#{pr.number}</span>{' '}
                {pr.title}
                <span className="mt-1 block text-muted">by {pr.user}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
