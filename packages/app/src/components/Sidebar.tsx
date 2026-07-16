import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';

type ContextMenuState = {
  path: string;
  x: number;
  y: number;
};

export function Sidebar() {
  const repos = useAppStore((s) => s.repos);
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const username = useAppStore((s) => s.username);
  const isAuthenticating = useAppStore((s) => s.isAuthenticating);
  const sidebarWidth = useAppStore((s) => s.sidebarWidth);
  const appMode = useAppStore((s) => s.appMode);
  const unreadNotifications = useAppStore((s) => s.unreadNotifications);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenu(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  return (
    <aside
      className="flex shrink-0 flex-col border-r border-border bg-surface-elevated"
      style={{ width: sidebarWidth }}
    >
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold text-foreground">GitLurk</h1>
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

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => useAppStore.getState().setAppMode('discover')}
          className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm ${
            appMode === 'discover'
              ? 'bg-primary/20 text-primary'
              : 'text-foreground hover:bg-surface'
          }`}
        >
          <span>Discover</span>
          {unreadNotifications > 0 ? (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-white">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => useAppStore.getState().setAppMode('workspace')}
          className={`mt-1 w-full rounded-md px-2 py-2 text-left text-sm ${
            appMode === 'workspace'
              ? 'bg-primary/20 text-primary'
              : 'text-foreground hover:bg-surface'
          }`}
        >
          Workspace
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
                  onClick={() => {
                    useAppStore.getState().setAppMode('workspace');
                    void dispatcher.selectRepo(repo.path);
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setMenu({
                      path: repo.path,
                      x: event.clientX,
                      y: event.clientY,
                    });
                  }}
                  className={`w-full rounded-md px-2 py-2 text-left text-sm ${
                    activeRepoPath === repo.path && appMode === 'workspace'
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

      {menu ? (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 min-w-[180px] rounded-md border border-border bg-surface-elevated py-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
        >
          {(
            [
              ['explorer', 'Open in Explorer'],
              ['terminal', 'Open in Terminal'],
              ['github', 'Open on GitHub'],
              ['remove', 'Remove from list'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-surface ${
                id === 'remove' ? 'text-danger' : ''
              }`}
              onClick={() => {
                const path = menu.path;
                setMenu(null);
                if (id === 'explorer') {
                  void dispatcher.revealInExplorer(path);
                } else if (id === 'terminal') {
                  void dispatcher.openTerminalAt(path);
                } else if (id === 'github') {
                  void dispatcher.openRepoOnGitHub(path);
                } else {
                  void dispatcher.removeRepo(path);
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
