import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChangesView } from './components/ChangesView';
import { DiscoverView } from './components/DiscoverView';
import { CloneDialog } from './components/CloneDialog';
import { BranchPanel } from './components/BranchPanel';
import { PullRequestPanel } from './components/PullRequestPanel';
import { TerminalPane } from './components/TerminalPane';
import { PluginsPanel } from './components/PluginsPanel';
import { AuthDialog } from './components/AuthDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { GhRunWatchDialog } from './components/GhRunWatchDialog';
import { ResizeHandle } from './components/ResizeHandle';
import { Toast } from './components/Toast';
import { dispatcher } from './dispatcher';
import { useAppStore } from './stores';

export function App() {
  const loading = useAppStore((s) => s.loading);
  const resolvedTheme = useAppStore((s) => s.resolvedTheme);
  const explorerMenuEnabled = useAppStore((s) => s.explorerMenuEnabled);
  const error = useAppStore((s) => s.error);
  const appMode = useAppStore((s) => s.appMode);
  const rightRailWidth = useAppStore((s) => s.rightRailWidth);

  useEffect(() => {
    void dispatcher.initialize();
  }, []);

  return (
    <div
      className={`flex h-screen flex-col ${resolvedTheme === 'dark' ? 'dark' : 'light'}`}
    >
      <div className="flex min-h-0 flex-1 bg-surface text-foreground">
        <Sidebar />
        <ResizeHandle
          orientation="vertical"
          onDrag={(delta) => dispatcher.resizeSidebar(delta)}
        />
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">
                {loading ? 'Working…' : 'Ready'}
              </span>
              <div className="flex rounded-md border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => useAppStore.getState().setAppMode('workspace')}
                  className={`rounded px-2 py-1 text-xs ${
                    appMode === 'workspace'
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Workspace
                </button>
                <button
                  type="button"
                  onClick={() => useAppStore.getState().setAppMode('discover')}
                  className={`rounded px-2 py-1 text-xs ${
                    appMode === 'discover'
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Discover
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={explorerMenuEnabled}
                  onChange={(e) =>
                    void dispatcher.setExplorerMenu(e.target.checked)
                  }
                />
                Explorer context menu
              </label>
              <button
                type="button"
                onClick={() => useAppStore.getState().setShowSettings(true)}
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-elevated"
                title="Settings"
              >
                ⚙ Settings
              </button>
              <button
                type="button"
                onClick={() => useAppStore.getState().setShowPlugins(true)}
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-elevated"
              >
                Plugins
              </button>
              <button
                type="button"
                onClick={() => useAppStore.getState().setShowTerminal(true)}
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-elevated"
              >
                Terminal pane
              </button>
              <button
                type="button"
                onClick={() => void dispatcher.toggleTheme()}
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-elevated"
              >
                Toggle theme
              </button>
            </div>
          </header>
          {error ? (
            <div className="mx-4 mt-3 rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
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
          {appMode === 'discover' ? (
            <DiscoverView />
          ) : (
            <div className="flex min-h-0 flex-1">
              <ChangesView />
              <ResizeHandle
                orientation="vertical"
                onDrag={(delta) => dispatcher.resizeRightRail(delta)}
              />
              <div
                className="flex shrink-0 flex-col border-l border-border"
                style={{ width: rightRailWidth }}
              >
                <BranchPanel />
                <PullRequestPanel />
              </div>
            </div>
          )}
          <TerminalPane />
          <PluginsPanel />
        </main>
      </div>
      <CloneDialog />
      <AuthDialog />
      <SettingsDialog />
      <GhRunWatchDialog />
      <Toast />
    </div>
  );
}
