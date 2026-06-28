import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';

export function Sidebar() {
  const repos = useAppStore((s) => s.repos);
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const username = useAppStore((s) => s.username);
  const isAuthenticating = useAppStore((s) => s.isAuthenticating);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface-elevated">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold text-foreground">MyGit</h1>
        <p className="text-xs text-muted">Desktop for Windows</p>
      </div>

      <div className="flex gap-2 p-3">
        <button
          type="button"
          onClick={() => void dispatcher.openLocalRepo()}
          className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-surface"
        >
          Open
        </button>
        <button
          type="button"
          onClick={() => useAppStore.getState().setShowCloneDialog(true)}
          className="flex-1 rounded-md bg-accent px-2 py-1.5 text-xs text-white hover:bg-accent-hover"
        >
          Clone
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <p className="px-2 py-1 text-xs font-medium uppercase text-muted">
          Repositories
        </p>
        {repos.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted">
            No repositories yet. Open or clone one to get started.
          </p>
        ) : (
          <ul className="space-y-1">
            {repos.map((repo) => (
              <li key={repo.path}>
                <button
                  type="button"
                  onClick={() => void dispatcher.selectRepo(repo.path)}
                  className={`w-full rounded-md px-2 py-2 text-left text-sm ${
                    activeRepoPath === repo.path
                      ? 'bg-primary/20 text-primary'
                      : 'text-foreground hover:bg-surface'
                  }`}
                  title={repo.path}
                >
                  {repo.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border p-3">
        {username ? (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted">@{username}</span>
            <button
              type="button"
              onClick={() => void dispatcher.signOut()}
              className="text-xs text-primary hover:underline"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={isAuthenticating}
            onClick={() => void dispatcher.signInGitHub()}
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs hover:bg-surface disabled:opacity-50"
          >
            {isAuthenticating ? 'Signing in…' : 'Sign in to GitHub'}
          </button>
        )}
      </div>
    </aside>
  );
}
