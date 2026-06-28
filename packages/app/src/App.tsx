import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChangesView } from './components/ChangesView';
import { CloneDialog } from './components/CloneDialog';
import { BranchPanel } from './components/BranchPanel';
import { PullRequestPanel } from './components/PullRequestPanel';
import { TerminalPane } from './components/TerminalPane';
import { PluginsPanel } from './components/PluginsPanel';
import { Toast } from './components/Toast';
import { dispatcher } from './dispatcher';
import { useAppStore } from './stores';

export function App() {
  const loading = useAppStore((s) => s.loading);
  const resolvedTheme = useAppStore((s) => s.resolvedTheme);
  const explorerMenuEnabled = useAppStore((s) => s.explorerMenuEnabled);

  useEffect(() => {
    void dispatcher.initialize();
  }, []);

  return (
    <div
      className={`flex h-screen flex-col ${resolvedTheme === 'dark' ? 'dark' : 'light'}`}
    >
      <div className="flex min-h-0 flex-1 bg-surface text-foreground">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-xs text-muted">
              {loading ? 'Working…' : 'Ready'}
            </span>
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
          <div className="flex min-h-0 flex-1">
            <ChangesView />
            <div className="flex w-56 shrink-0 flex-col border-l border-border">
              <BranchPanel />
              <PullRequestPanel />
            </div>
          </div>
          <TerminalPane />
          <PluginsPanel />
        </main>
      </div>
      <CloneDialog />
      <Toast />
    </div>
  );
}
