import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChangesView } from './components/ChangesView';
import { HistoryPanel } from './components/HistoryPanel';
import { DiscoverView } from './components/DiscoverView';
import { CloneDialog } from './components/CloneDialog';
import { BranchPanel } from './components/BranchPanel';
import { StashPanel } from './components/StashPanel';
import { PullRequestPanel } from './components/PullRequestPanel';
import { TerminalPane } from './components/TerminalPane';
import { PluginsPanel } from './components/PluginsPanel';
import { AuthDialog } from './components/AuthDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { GhRunWatchDialog } from './components/GhRunWatchDialog';
import { CommandPalette } from './components/CommandPalette';
import { OnboardingDialog } from './components/OnboardingDialog';
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
  const workspaceTab = useAppStore((s) => s.workspaceTab);
  const rightRailWidth = useAppStore((s) => s.rightRailWidth);
  const unreadNotifications = useAppStore((s) => s.unreadNotifications);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const hotkeyCommandPalette = useAppStore((s) => s.hotkeyCommandPalette);

  useEffect(() => {
    void dispatcher.initialize();
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (useAppStore.getState().theme === 'system') {
        void dispatcher.applyAppearance();
      }
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      dispatcher.handleKeyboardShortcut(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      className={`flex h-screen flex-col ${resolvedTheme === 'dark' ? 'dark' : 'light'}`}
    >
      <div className="flex min-h-0 flex-1 bg-surface text-foreground">
        {!sidebarCollapsed ? (
          <>
            <Sidebar />
            <ResizeHandle
              orientation="vertical"
              onDrag={(delta) => dispatcher.resizeSidebar(delta)}
            />
          </>
        ) : null}
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
                  onClick={() => dispatcher.openDiscover('feed')}
                  className={`rounded px-2 py-1 text-xs ${
                    appMode === 'discover'
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Discover
                </button>
              </div>
              {appMode === 'workspace' ? (
                <div className="flex rounded-md border border-border p-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      useAppStore.getState().setWorkspaceTab('changes')
                    }
                    className={`rounded px-2 py-1 text-xs ${
                      workspaceTab === 'changes'
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Changes
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      useAppStore.getState().setWorkspaceTab('history')
                    }
                    className={`rounded px-2 py-1 text-xs ${
                      workspaceTab === 'history'
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    History
                  </button>
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  useAppStore.getState().setShowCommandPalette(true)
                }
                className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-surface-elevated"
                title={`Command palette (Ctrl+K / ${hotkeyCommandPalette || 'Ctrl+Shift+P'})`}
              >
                ⌘K
              </button>
              <button
                type="button"
                onClick={() => dispatcher.openNotifications()}
                className="relative rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-surface-elevated"
                title="Notifications"
                aria-label="Notifications"
              >
                <span aria-hidden>🔔</span>
                {unreadNotifications > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[1rem] rounded-full bg-accent px-1 text-center text-[10px] leading-4 text-white">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                ) : null}
              </button>
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
              {workspaceTab === 'history' ? <HistoryPanel /> : <ChangesView />}
              <ResizeHandle
                orientation="vertical"
                onDrag={(delta) => dispatcher.resizeRightRail(delta)}
              />
              <div
                className="flex shrink-0 flex-col border-l border-border"
                style={{ width: rightRailWidth }}
              >
                <BranchPanel />
                <StashPanel />
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
      <CommandPalette />
      <OnboardingDialog />
      <Toast />
    </div>
  );
}
