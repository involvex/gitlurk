import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';

export function PullRequestPanel() {
  const pulls = useAppStore((s) => s.pulls);
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const activePullNumber = useAppStore((s) => s.activePullNumber);

  if (!activeRepoPath) return null;

  return (
    <section className="border-t border-border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Pull Requests</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => useAppStore.getState().setShowCreatePrDialog(true)}
            className="text-xs text-primary hover:underline"
          >
            New PR
          </button>
          <button
            type="button"
            onClick={() => void dispatcher.refreshPullRequests()}
            className="text-xs text-primary hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>
      {pulls.length === 0 ? (
        <p className="text-xs text-muted">No open pull requests</p>
      ) : (
        <ul className="space-y-2">
          {pulls.map((pr) => (
            <li key={pr.number}>
              <button
                type="button"
                onClick={() => void dispatcher.openPullRequest(pr.number)}
                className={`block w-full rounded-md border px-3 py-2 text-left text-xs hover:bg-surface ${
                  activePullNumber === pr.number
                    ? 'border-primary bg-primary/10'
                    : 'border-border'
                }`}
              >
                <span className="font-medium text-primary">#{pr.number}</span>{' '}
                {pr.title}
                <span className="mt-1 block text-muted">by {pr.user}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
