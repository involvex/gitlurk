import { parseGitHubRemoteUrl } from '@gitlurk/shared';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { ipcInvoke, onEvent, runningInTauri } from '../ipc/client';
import { matchesHotkey } from '../lib/hotkeys';
import { useAppStore } from '../stores';
import type { AiProvider } from '../stores/ui';
import type { DiffKind } from '../stores/git-ops';

function getStore() {
  return useAppStore.getState();
}

let githubSignInCancelled = false;
let notificationPollTimer: ReturnType<typeof setInterval> | null = null;
let fetchPollTimer: ReturnType<typeof setInterval> | null = null;
let panelPersistTimer: ReturnType<typeof setTimeout> | null = null;
let lastNotifiedUnread = 0;
let repoChangeDebounce: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight = 0;
let pendingRefreshAfterInFlight = false;

async function persistRepos() {
  const repos = getStore().repos.map((r) => ({
    path: r.path,
    pinned: r.pinned,
    lastOpenedAt: r.lastOpenedAt,
  }));
  await ipcInvoke('app:save-repos', { repos });
}

async function maybeNotify(title: string, body: string) {
  if (!getStore().desktopNotifications) return;
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === 'granted';
    }
    if (granted) {
      await sendNotification({ title, body });
    }
  } catch {
    // Notifications are optional.
  }
}

async function syncRepoWatcher(path: string | null) {
  if (!getStore().autoRefreshOnChange) {
    await ipcInvoke('app:watch-repo', { path: null });
    return;
  }
  await ipcInvoke('app:watch-repo', { path });
}

function schedulePanelPersist() {
  if (panelPersistTimer) clearTimeout(panelPersistTimer);
  panelPersistTimer = setTimeout(() => {
    void dispatcher.persistPanelSettings();
  }, 250);
}

export const dispatcher = {
  async initialize() {
    if (!runningInTauri()) {
      getStore().setError(
        'Running in browser only — start the desktop shell with: bun run tauri:dev',
      );
      return;
    }

    const [{ repos }, settings, auth, explorerMenu] = await Promise.all([
      ipcInvoke('app:get-repos', {}),
      ipcInvoke('app:get-settings', {}),
      ipcInvoke('auth:get-token', {}),
      ipcInvoke('app:get-explorer-menu', {}),
    ]);

    getStore().setRepos(
      repos.map((entry) => ({
        path: entry.path,
        name: entry.path.split(/[/\\]/).pop() ?? entry.path,
        pinned: entry.pinned ?? false,
        lastOpenedAt: entry.lastOpenedAt ?? null,
      })),
    );
    getStore().setTheme(settings.theme);
    getStore().applyPanelSettings({
      sidebarWidth: settings.sidebarWidth,
      fileListWidth: settings.fileListWidth,
      rightRailWidth: settings.rightRailWidth,
      terminalHeight: settings.terminalHeight,
      aiProvider: settings.aiProvider,
      aiModel: settings.aiModel,
      kiloBaseUrl: settings.kiloBaseUrl,
      minimizeToTray: settings.minimizeToTray,
      terminalShell: settings.terminalShell,
      terminalShellPath: settings.terminalShellPath,
      backgroundFetchEnabled: settings.backgroundFetchEnabled,
      backgroundFetchIntervalMin: settings.backgroundFetchIntervalMin,
      desktopNotifications: settings.desktopNotifications,
      autoRefreshOnChange: settings.autoRefreshOnChange,
      onboardingCompleted: settings.onboardingCompleted,
      themePreset:
        (settings.themePreset as
          'github-dark' | 'github-light' | 'dim' | 'high-contrast') ??
        'github-dark',
      hotkeyShowApp: settings.hotkeyShowApp ?? 'Ctrl+Alt+G',
      hotkeyCommandPalette: settings.hotkeyCommandPalette ?? 'Ctrl+Shift+P',
    });
    getStore().setAuth(auth.username);
    getStore().setExplorerMenuEnabled(explorerMenu.enabled);
    await dispatcher.applyTheme(settings.theme);
    dispatcher.startNotificationPolling();
    dispatcher.startBackgroundFetch();

    if (!settings.onboardingCompleted && repos.length === 0) {
      getStore().setShowOnboarding(true);
    }

    await onEvent('repo-changed', () => {
      if (!getStore().autoRefreshOnChange) return;
      if (repoChangeDebounce) clearTimeout(repoChangeDebounce);
      repoChangeDebounce = setTimeout(() => {
        void dispatcher.refreshStatus();
      }, 1200);
    });

    await onEvent('url-action', (action) => {
      void dispatcher.handleUrlAction(action);
    });
    await onEvent('cli-action', (action) => {
      void dispatcher.handleUrlAction(action);
    });
    await onEvent('tray-action', (action) => {
      if (action === 'pull') {
        void dispatcher.pullActiveRepo();
      } else if (action === 'notifications') {
        dispatcher.openNotifications();
      } else if (action === 'discover') {
        dispatcher.openDiscover();
      } else if (action === 'settings') {
        getStore().setShowSettings(true);
      } else if (action === 'show') {
        // Window already focused by tray; nothing else required.
      }
    });

    // Cold-start --open-local is queued before the webview listens; drain it now.
    const pending = await ipcInvoke('app:take-pending-action', {});
    if (pending) {
      await dispatcher.handleUrlAction(pending);
    }
  },

  startNotificationPolling() {
    if (notificationPollTimer) {
      clearInterval(notificationPollTimer);
      notificationPollTimer = null;
    }
    const poll = async () => {
      if (!getStore().username) {
        getStore().setUnreadNotifications(0);
        lastNotifiedUnread = 0;
        return;
      }
      try {
        const result = await ipcInvoke('github:list-notifications', {
          all: false,
        });
        const prev = getStore().unreadNotifications;
        getStore().setUnreadNotifications(result.unreadCount);
        if (
          result.unreadCount > prev &&
          result.unreadCount > lastNotifiedUnread
        ) {
          lastNotifiedUnread = result.unreadCount;
          await maybeNotify(
            'GitLurk',
            `${result.unreadCount} unread GitHub notification${result.unreadCount === 1 ? '' : 's'}`,
          );
        }
      } catch {
        // Ignore poll failures (missing scope until re-auth, offline, etc.)
      }
    };
    void poll();
    notificationPollTimer = setInterval(() => void poll(), 60_000);
  },

  startBackgroundFetch() {
    if (fetchPollTimer) {
      clearInterval(fetchPollTimer);
      fetchPollTimer = null;
    }
    const poll = async () => {
      if (!getStore().backgroundFetchEnabled) return;
      const path = getStore().activeRepoPath;
      if (!path) return;
      try {
        await ipcInvoke('git:fetch', { path });
        const { ahead } = await ipcInvoke('git:remote-ahead', { path });
        if (ahead && ahead > 0) {
          getStore().showToast(`Remote is ${ahead} commit(s) ahead`);
          await maybeNotify(
            'GitLurk',
            `Remote branch is ${ahead} commit(s) ahead`,
          );
        }
      } catch {
        // Ignore background fetch failures.
      }
    };
    const schedule = () => {
      const minutes = getStore().backgroundFetchIntervalMin || 15;
      fetchPollTimer = setInterval(() => void poll(), minutes * 60_000);
    };
    schedule();
  },

  async setBackgroundFetchEnabled(enabled: boolean) {
    getStore().setBackgroundFetchEnabled(enabled);
    await ipcInvoke('app:set-settings', { backgroundFetchEnabled: enabled });
    dispatcher.startBackgroundFetch();
  },

  async setBackgroundFetchIntervalMin(minutes: number) {
    getStore().setBackgroundFetchIntervalMin(minutes);
    await ipcInvoke('app:set-settings', {
      backgroundFetchIntervalMin: minutes,
    });
    dispatcher.startBackgroundFetch();
  },

  async setDesktopNotifications(enabled: boolean) {
    getStore().setDesktopNotifications(enabled);
    await ipcInvoke('app:set-settings', { desktopNotifications: enabled });
  },

  async setAutoRefreshOnChange(enabled: boolean) {
    getStore().setAutoRefreshOnChange(enabled);
    await ipcInvoke('app:set-settings', { autoRefreshOnChange: enabled });
    await syncRepoWatcher(getStore().activeRepoPath);
  },

  async completeOnboarding() {
    getStore().setOnboardingCompleted(true);
    getStore().setShowOnboarding(false);
    await ipcInvoke('app:set-settings', { onboardingCompleted: true });
  },

  setPendingDiscard(pending: import('../stores/ui').UiSlice['pendingDiscard']) {
    getStore().setPendingDiscard(pending);
  },

  requestDiscard(file: string, kind: DiffKind) {
    getStore().setPendingDiscard({ type: 'discard-file', file, kind });
  },

  openDiscover(tab: import('../stores/ui').DiscoverTab = 'feed') {
    getStore().setDiscoverTab(tab);
    getStore().setAppMode('discover');
  },

  openNotifications() {
    dispatcher.openDiscover('notifications');
  },

  async persistPanelSettings() {
    const s = getStore();
    await ipcInvoke('app:set-settings', {
      sidebarWidth: s.sidebarWidth,
      fileListWidth: s.fileListWidth,
      rightRailWidth: s.rightRailWidth,
      terminalHeight: s.terminalHeight,
    });
  },

  resizeSidebar(delta: number) {
    getStore().setSidebarWidth(getStore().sidebarWidth + delta);
    schedulePanelPersist();
  },

  resizeFileList(delta: number) {
    getStore().setFileListWidth(getStore().fileListWidth + delta);
    schedulePanelPersist();
  },

  resizeRightRail(delta: number) {
    getStore().setRightRailWidth(getStore().rightRailWidth + delta);
    schedulePanelPersist();
  },

  resizeTerminal(delta: number, fromHeight?: number) {
    const base = fromHeight ?? getStore().terminalHeight;
    getStore().setTerminalHeight(base + delta);
  },

  async saveAiSettings(opts: {
    aiProvider: AiProvider;
    aiModel: string;
    kiloBaseUrl: string;
  }) {
    getStore().setAiProvider(opts.aiProvider);
    getStore().setAiModel(opts.aiModel);
    getStore().setKiloBaseUrl(opts.kiloBaseUrl);
    await ipcInvoke('app:set-settings', {
      aiProvider: opts.aiProvider,
      aiModel: opts.aiModel,
      kiloBaseUrl: opts.kiloBaseUrl,
    });
  },

  async setMinimizeToTray(enabled: boolean) {
    getStore().setMinimizeToTray(enabled);
    await ipcInvoke('app:set-settings', { minimizeToTray: enabled });
  },

  async setTerminalShell(shell: 'pwsh' | 'powershell' | 'cmd' | 'custom') {
    getStore().setTerminalShell(shell);
    await ipcInvoke('app:set-settings', { terminalShell: shell });
  },

  async setTerminalShellPath(path: string) {
    getStore().setTerminalShellPath(path);
    await ipcInvoke('app:set-settings', { terminalShellPath: path });
  },

  async generateCommitMessage() {
    const path = getStore().activeRepoPath;
    if (!path) return;
    try {
      const { message } = await ipcInvoke('ai:generate-commit-message', {
        path,
      });
      getStore().setCommitMessage(message);
      getStore().showToast('Commit message generated');
    } catch (error) {
      getStore().setError(
        error instanceof Error
          ? error.message
          : 'Failed to generate commit message',
      );
    }
  },

  async applyTheme(theme: 'light' | 'dark' | 'system') {
    getStore().setTheme(theme);
    await dispatcher.applyAppearance();
    await ipcInvoke('app:set-theme', { theme });
  },

  async applyThemePreset(
    preset: 'github-dark' | 'github-light' | 'dim' | 'high-contrast',
  ) {
    const isLight = preset === 'github-light';
    getStore().setThemePreset(preset);
    getStore().setTheme(isLight ? 'light' : 'dark');
    await ipcInvoke('app:set-settings', {
      themePreset: preset,
      theme: isLight ? 'light' : 'dark',
    });
    await dispatcher.applyAppearance();
  },

  resolveActivePreset():
    'github-dark' | 'github-light' | 'dim' | 'high-contrast' {
    const { theme, themePreset } = getStore();
    const custom = themePreset === 'dim' || themePreset === 'high-contrast';
    if (theme === 'system' && !custom) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'github-dark'
        : 'github-light';
    }
    if (theme === 'light') return 'github-light';
    if (theme === 'dark') {
      if (themePreset === 'github-light') return 'github-dark';
      return themePreset;
    }
    return themePreset;
  },

  async applyAppearance() {
    const preset = dispatcher.resolveActivePreset();
    const resolved =
      preset === 'github-light' ? ('light' as const) : ('dark' as const);

    getStore().setResolvedTheme(resolved);
    document.documentElement.dataset.theme = preset;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.classList.toggle('light', resolved === 'light');
  },

  async toggleTheme() {
    const current = getStore().theme;
    const next =
      current === 'system' ? 'dark' : current === 'dark' ? 'light' : 'system';
    getStore().setTheme(next);
    await dispatcher.applyTheme(next);
  },

  async setHotkeys(hotkeys: {
    hotkeyShowApp?: string;
    hotkeyCommandPalette?: string;
  }) {
    if (hotkeys.hotkeyShowApp) {
      getStore().setHotkeyShowApp(hotkeys.hotkeyShowApp);
    }
    if (hotkeys.hotkeyCommandPalette) {
      getStore().setHotkeyCommandPalette(hotkeys.hotkeyCommandPalette);
    }
    await ipcInvoke('app:set-settings', {
      hotkeyShowApp: hotkeys.hotkeyShowApp,
      hotkeyCommandPalette: hotkeys.hotkeyCommandPalette,
    });
  },

  async openLocalRepo() {
    const path = await ipcInvoke('dialog:open-directory', {
      title: 'Open Git Repository',
    });
    if (!path) return;

    const { isRepo } = await ipcInvoke('git:is-repo', { path });
    if (!isRepo) {
      getStore().setError('Selected folder is not a Git repository');
      return;
    }

    getStore().addRepo(path);
    await persistRepos();
    await syncRepoWatcher(path);
    await dispatcher.refreshStatus();
    await dispatcher.refreshBranches();
    await dispatcher.refreshPullRequests();
  },

  async cloneRepo(
    url: string,
    dir: string,
    options?: { recurseSubmodules?: boolean; depth?: number },
  ) {
    getStore().setGitOpLoading(true);
    getStore().setError(null);
    try {
      const { path } = await ipcInvoke('git:clone', {
        url,
        dir,
        recurseSubmodules: options?.recurseSubmodules,
        depth: options?.depth,
      });
      getStore().addRepo(path);
      await persistRepos();
      getStore().setShowCloneDialog(false);
      await dispatcher.refreshStatus();
      await dispatcher.refreshBranches();
      await dispatcher.refreshPullRequests();
      getStore().showToast('Repository cloned successfully');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Clone failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  async selectRepo(path: string) {
    getStore().setActiveRepo(path);
    getStore().touchRepo(path);
    await persistRepos();
    await syncRepoWatcher(path);
    await dispatcher.refreshStatus();
    await dispatcher.refreshBranches();
    await dispatcher.refreshPullRequests();
    await dispatcher.refreshStashes();
    await dispatcher.refreshCommitLog();
  },

  async refreshStatus() {
    const path = getStore().activeRepoPath;
    if (!path) return;

    if (refreshInFlight > 0) {
      pendingRefreshAfterInFlight = true;
      return;
    }

    refreshInFlight += 1;
    getStore().setGitOpLoading(true);
    try {
      const status = await ipcInvoke('git:status', { path });
      getStore().setStatus(status);
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Failed to get status',
      );
    } finally {
      refreshInFlight -= 1;
      getStore().setGitOpLoading(false);
      if (pendingRefreshAfterInFlight && refreshInFlight === 0) {
        pendingRefreshAfterInFlight = false;
        void dispatcher.refreshStatus();
      }
    }
  },

  async refreshBranches() {
    const path = getStore().activeRepoPath;
    if (!path) return;

    const { branches, current } = await ipcInvoke('git:branch-list', { path });
    getStore().setBranches(branches, current);
  },

  async commit() {
    const path = getStore().activeRepoPath;
    const message = getStore().commitMessage.trim();
    if (!path || !message) return;

    getStore().setGitOpLoading(true);
    try {
      await ipcInvoke('git:commit', { path, message });
      getStore().setCommitMessage('');
      await dispatcher.refreshStatus();
      getStore().showToast('Commit created');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Commit failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  async pull() {
    const path = getStore().activeRepoPath;
    if (!path) return;

    getStore().setGitOpLoading(true);
    try {
      await ipcInvoke('git:pull', { path });
      await dispatcher.refreshStatus();
      getStore().showToast('Pull completed');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Pull failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  async push() {
    const path = getStore().activeRepoPath;
    if (!path) return;

    getStore().setGitOpLoading(true);
    try {
      await ipcInvoke('git:push', { path });
      getStore().showToast('Push completed');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Push failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  async pullActiveRepo() {
    await dispatcher.pull();
  },

  async createBranch(name: string) {
    const path = getStore().activeRepoPath;
    if (!path || !name.trim()) return;

    await ipcInvoke('git:branch-create', { path, name: name.trim() });
    await dispatcher.refreshBranches();
    getStore().showToast(`Branch ${name} created`);
  },

  async checkoutBranch(name: string) {
    const path = getStore().activeRepoPath;
    if (!path) return;

    await ipcInvoke('git:branch-checkout', { path, name });
    await dispatcher.refreshStatus();
    await dispatcher.refreshBranches();
    getStore().showToast(`Switched to ${name}`);
  },

  async refreshPullRequests() {
    const path = getStore().activeRepoPath;
    if (!path) return;

    try {
      const { url: originResult } = await ipcInvoke('git:get-remote-origin', {
        path,
      });
      if (!originResult) {
        getStore().setPulls([]);
        return;
      }

      const parsed = parseGitHubRemoteUrl(originResult);
      if (!parsed) {
        getStore().setPulls([]);
        return;
      }

      const { pulls } = await ipcInvoke('github:list-prs', parsed);
      getStore().setPulls(pulls);
    } catch {
      getStore().setPulls([]);
    }
  },

  async signInGitHub() {
    githubSignInCancelled = false;
    getStore().setAuthenticating(true);
    getStore().setError(null);
    try {
      const device = await ipcInvoke('auth:github-device-start', {});
      getStore().setAuthDialog({
        userCode: device.userCode,
        verificationUri: device.verificationUri,
        status: 'Waiting for authorization…',
      });
      await ipcInvoke('shell:open-external', {
        url: device.verificationUri,
      });

      const deadline = Date.now() + device.expiresIn * 1000;
      let intervalMs = device.interval * 1000;
      while (Date.now() < deadline) {
        if (githubSignInCancelled) {
          getStore().setAuthDialogStatus('Cancelled');
          return;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
        if (githubSignInCancelled) {
          return;
        }
        const result = await ipcInvoke('auth:github-device-poll', {
          deviceCode: device.deviceCode,
        });
        if (result.success) {
          const auth = await ipcInvoke('auth:get-token', {});
          getStore().setAuth(auth.username);
          getStore().setAuthDialog(null);
          getStore().showToast(`Signed in as ${auth.username ?? 'user'}`);
          dispatcher.startNotificationPolling();
          await dispatcher.refreshPullRequests();
          return;
        }
        if (result.slowDown) {
          intervalMs += 5000;
          getStore().setAuthDialogStatus(
            'GitHub asked to slow down — retrying…',
          );
        } else {
          getStore().setAuthDialogStatus('Waiting for authorization…');
        }
        if (result.error) {
          throw new Error(result.error);
        }
      }
      throw new Error('Device authorization timed out');
    } catch (error) {
      getStore().setAuthDialog(null);
      getStore().setError(
        error instanceof Error ? error.message : 'Sign in failed',
      );
    } finally {
      getStore().setAuthenticating(false);
      if (githubSignInCancelled) {
        getStore().setAuthDialog(null);
      }
    }
  },

  cancelGitHubSignIn() {
    githubSignInCancelled = true;
    getStore().setAuthDialog(null);
    getStore().setAuthenticating(false);
  },

  async openExternal(url: string) {
    await ipcInvoke('shell:open-external', { url });
  },

  async signOut() {
    await ipcInvoke('auth:logout', {});
    getStore().setAuth(null);
    getStore().setUnreadNotifications(0);
  },

  async setExplorerMenu(enabled: boolean) {
    try {
      await ipcInvoke('app:set-explorer-menu', { enabled });
      getStore().setExplorerMenuEnabled(enabled);
      getStore().showToast(
        enabled
          ? 'Explorer context menu enabled'
          : 'Explorer context menu disabled',
      );
    } catch (error) {
      getStore().setError(
        error instanceof Error
          ? error.message
          : 'Failed to update Explorer menu (admin rights may be required)',
      );
    }
  },

  async loadFileDiff(file: string, kind: import('../stores/git-ops').DiffKind) {
    const path = getStore().activeRepoPath;
    if (!path) return;

    getStore().setSelectedFile(file, kind);
    getStore().setDiffLoading(true);
    getStore().setFileDiff(null);
    try {
      const diff = await ipcInvoke('git:diff', { path, file, kind });
      getStore().setFileDiff(diff);
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Failed to load diff',
      );
    } finally {
      getStore().setDiffLoading(false);
    }
  },

  async installPlugin(id: string) {
    getStore().setGitOpLoading(true);
    try {
      await ipcInvoke('plugins:install', { id });
      getStore().showToast(`Installed plugin ${id}`);
      getStore().setShowPlugins(true);
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Plugin install failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  async invokePlugin(id: string) {
    try {
      const { result } = await ipcInvoke('plugins:invoke', {
        id,
        method: 'hello.say',
        params: {},
      });
      getStore().showToast(result || 'Plugin invoked');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Plugin invoke failed',
      );
    }
  },

  async openTerminal() {
    const path = getStore().activeRepoPath;
    if (!path) return;
    await dispatcher.openTerminalAt(path);
  },

  async openTerminalAt(path: string) {
    await ipcInvoke('shell:open-terminal', { path });
  },

  async revealInExplorer(path: string) {
    try {
      await ipcInvoke('shell:reveal-in-explorer', { path });
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Failed to open Explorer',
      );
    }
  },

  async openRepoOnGitHub(path: string) {
    try {
      const { url: origin } = await ipcInvoke('git:get-remote-origin', {
        path,
      });
      if (!origin) {
        getStore().showToast('No remote origin configured');
        return;
      }
      const parsed = parseGitHubRemoteUrl(origin);
      if (!parsed) {
        getStore().showToast('Remote is not a GitHub repository');
        return;
      }
      await ipcInvoke('shell:open-external', {
        url: `https://github.com/${parsed.owner}/${parsed.repo}`,
      });
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Failed to open GitHub',
      );
    }
  },

  async watchCiRun(path: string) {
    const store = getStore();
    store.setGhRunWatchPath(path);
    store.clearGhRunWatchLog();
    store.setGhRunWatchRunning(true);
    store.setShowGhRunWatch(true);
    try {
      const version = await ipcInvoke('dev:gh-version', {});
      if (!version.installed) {
        store.setGhRunWatchRunning(false);
        store.appendGhRunWatchLog(
          'GitHub CLI (gh) not found. Install from https://cli.github.com\n',
        );
        return;
      }
      await ipcInvoke('dev:gh-run-watch', { path });
    } catch (error) {
      store.setGhRunWatchRunning(false);
      store.appendGhRunWatchLog(
        `${error instanceof Error ? error.message : 'Failed to watch CI run'}\n`,
      );
    }
  },

  async stopWatchCiRun() {
    try {
      await ipcInvoke('dev:gh-run-watch-stop', {});
    } catch {
      // ignore
    }
    getStore().setGhRunWatchRunning(false);
  },

  async closeWatchCiRun() {
    await dispatcher.stopWatchCiRun();
    getStore().setShowGhRunWatch(false);
  },

  async removeRepo(path: string) {
    getStore().removeRepo(path);
    await persistRepos();
    getStore().showToast('Repository removed from list');
  },

  async toggleRepoPin(path: string) {
    getStore().toggleRepoPin(path);
    await persistRepos();
  },

  async stageFiles(files: string[]) {
    const path = getStore().activeRepoPath;
    if (!path || files.length === 0) return;
    getStore().setGitOpLoading(true);
    try {
      await ipcInvoke('git:add', { path, files });
      await dispatcher.refreshStatus();
      getStore().showToast('Staged');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Stage failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  async stageAll() {
    const path = getStore().activeRepoPath;
    if (!path) return;
    getStore().setGitOpLoading(true);
    try {
      await ipcInvoke('git:add', { path });
      await dispatcher.refreshStatus();
      getStore().showToast('All changes staged');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Stage all failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  async unstageFiles(files: string[]) {
    const path = getStore().activeRepoPath;
    if (!path || files.length === 0) return;
    getStore().setGitOpLoading(true);
    try {
      await ipcInvoke('git:reset', { path, files });
      await dispatcher.refreshStatus();
      getStore().showToast('Unstaged');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Unstage failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  async unstageAll() {
    const path = getStore().activeRepoPath;
    const staged = getStore().status?.staged ?? [];
    if (!path || staged.length === 0) return;
    await dispatcher.unstageFiles(staged);
  },

  async discardFile(file: string, kind: DiffKind) {
    const path = getStore().activeRepoPath;
    if (!path) return;
    getStore().setGitOpLoading(true);
    try {
      if (kind === 'untracked') {
        await ipcInvoke('git:clean', { path, files: [file] });
      } else if (kind === 'staged') {
        await ipcInvoke('git:restore', { path, files: [file], staged: true });
        await ipcInvoke('git:restore', { path, files: [file] });
      } else {
        await ipcInvoke('git:restore', { path, files: [file] });
      }
      await dispatcher.refreshStatus();
      getStore().setSelectedFile(null, null);
      getStore().setFileDiff(null);
      getStore().showToast('Changes discarded');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Discard failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  async discardAllUnstaged() {
    const path = getStore().activeRepoPath;
    if (!path) return;
    getStore().setGitOpLoading(true);
    try {
      await ipcInvoke('git:restore-all', { path });
      await dispatcher.refreshStatus();
      getStore().showToast('Unstaged changes discarded');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Discard failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  async discardAllUntracked() {
    const path = getStore().activeRepoPath;
    if (!path) return;
    getStore().setGitOpLoading(true);
    try {
      await ipcInvoke('git:clean', { path });
      await dispatcher.refreshStatus();
      getStore().showToast('Untracked files removed');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Clean failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  async stashPush(message?: string) {
    const path = getStore().activeRepoPath;
    if (!path) return;
    getStore().setGitOpLoading(true);
    try {
      await ipcInvoke('git:stash-push', { path, message });
      await dispatcher.refreshStatus();
      await dispatcher.refreshStashes();
      getStore().showToast('Changes stashed');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Stash failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  async refreshStashes() {
    const path = getStore().activeRepoPath;
    if (!path) return;
    try {
      const { entries } = await ipcInvoke('git:stash-list', { path });
      getStore().setStashes(entries);
    } catch {
      getStore().setStashes([]);
    }
  },

  async stashPop(index?: number) {
    const path = getStore().activeRepoPath;
    if (!path) return;
    getStore().setGitOpLoading(true);
    try {
      await ipcInvoke('git:stash-pop', { path, index });
      await dispatcher.refreshStatus();
      await dispatcher.refreshStashes();
      getStore().showToast('Stash applied');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Stash pop failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  async stashDrop(index: number) {
    const path = getStore().activeRepoPath;
    if (!path) return;
    getStore().setGitOpLoading(true);
    try {
      await ipcInvoke('git:stash-drop', { path, index });
      await dispatcher.refreshStashes();
      getStore().showToast('Stash dropped');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Stash drop failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  async refreshCommitLog() {
    const path = getStore().activeRepoPath;
    if (!path) return;
    try {
      const { entries } = await ipcInvoke('git:log', { path, limit: 80 });
      getStore().setCommitLog(entries);
    } catch {
      getStore().setCommitLog([]);
    }
  },

  async loadCommitDiff(sha: string) {
    const path = getStore().activeRepoPath;
    if (!path) return;
    getStore().setSelectedCommitSha(sha);
    getStore().setCommitDiffLoading(true);
    getStore().setCommitDiff(null);
    try {
      const diff = await ipcInvoke('git:show', { path, sha });
      getStore().setCommitDiff(diff);
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Failed to load commit',
      );
    } finally {
      getStore().setCommitDiffLoading(false);
    }
  },

  async stageHunk(patch: string) {
    const path = getStore().activeRepoPath;
    if (!path) return;
    getStore().setGitOpLoading(true);
    try {
      await ipcInvoke('git:apply-cached', { path, patch });
      await dispatcher.refreshStatus();
      const selectedFile = getStore().selectedFile;
      const diffKind = getStore().diffKind;
      if (selectedFile && diffKind) {
        await dispatcher.loadFileDiff(selectedFile, diffKind);
      }
      getStore().showToast('Hunk staged');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Stage hunk failed',
      );
    } finally {
      getStore().setGitOpLoading(false);
    }
  },

  handleKeyboardShortcut(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const editing =
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      target?.isContentEditable;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      getStore().setShowCommandPalette(true);
      return;
    }

    const paletteHotkey = getStore().hotkeyCommandPalette || 'Ctrl+Shift+P';
    if (matchesHotkey(event, paletteHotkey)) {
      event.preventDefault();
      getStore().setShowCommandPalette(true);
      return;
    }

    if (editing) return;

    if (event.key === 'F5') {
      event.preventDefault();
      void dispatcher.refreshStatus();
      return;
    }

    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
      return;
    }

    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'g') {
      event.preventDefault();
      void dispatcher.pull();
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      getStore().setSidebarCollapsed(!getStore().sidebarCollapsed);
    }
  },

  async handleUrlAction(
    action: import('@gitlurk/shared').UrlAction,
  ): Promise<void> {
    switch (action.type) {
      case 'openRepo':
      case 'clone': {
        const url = action.type === 'clone' ? action.url : action.url;
        const dir = await ipcInvoke('dialog:save-directory', {
          title: 'Clone Repository',
          defaultPath: url.split('/').pop()?.replace('.git', ''),
        });
        if (dir) {
          await dispatcher.cloneRepo(url, dir);
        }
        break;
      }
      case 'openLocalRepo': {
        const { isRepo } = await ipcInvoke('git:is-repo', {
          path: action.path,
        });
        if (isRepo) {
          getStore().addRepo(action.path);
          await persistRepos();
          if (action.branch) {
            await ipcInvoke('git:branch-checkout', {
              path: action.path,
              name: action.branch,
            });
          }
          getStore().setAppMode('workspace');
          await dispatcher.selectRepo(action.path);
          getStore().showToast(`Opened ${action.path}`);
        } else {
          getStore().setError(`Not a Git repository: ${action.path}`);
        }
        break;
      }
      case 'oauth':
        getStore().showToast('OAuth callback received');
        break;
      default:
        break;
    }
  },
};
