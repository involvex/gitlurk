import { parseGitHubRemoteUrl } from '@gitlurk/shared';
import { ipcInvoke, onEvent, runningInTauri } from '../ipc/client';
import { useAppStore } from '../stores';
import type { AiProvider } from '../stores/ui';

function getStore() {
  return useAppStore.getState();
}

let githubSignInCancelled = false;
let notificationPollTimer: ReturnType<typeof setInterval> | null = null;
let panelPersistTimer: ReturnType<typeof setTimeout> | null = null;

async function persistRepos() {
  const repos = getStore().repos.map((r) => r.path);
  await ipcInvoke('app:save-repos', { repos });
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
      repos.map((path) => ({
        path,
        name: path.split(/[/\\]/).pop() ?? path,
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
    });
    getStore().setAuth(auth.username);
    getStore().setExplorerMenuEnabled(explorerMenu.enabled);
    await dispatcher.applyTheme(settings.theme);
    dispatcher.startNotificationPolling();

    await onEvent('url-action', (action) => {
      void dispatcher.handleUrlAction(action);
    });
    await onEvent('cli-action', (action) => {
      void dispatcher.handleUrlAction(action);
    });
    await onEvent('tray-action', (action) => {
      if (action === 'pull') {
        void dispatcher.pullActiveRepo();
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
        return;
      }
      try {
        const result = await ipcInvoke('github:list-notifications', {
          all: false,
        });
        getStore().setUnreadNotifications(result.unreadCount);
      } catch {
        // Ignore poll failures (missing scope until re-auth, offline, etc.)
      }
    };
    void poll();
    notificationPollTimer = setInterval(() => void poll(), 60_000);
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
    const resolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;

    getStore().setResolvedTheme(resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.classList.toggle('light', resolved === 'light');
    await ipcInvoke('app:set-theme', { theme });
  },

  async toggleTheme() {
    const current = getStore().theme;
    const next =
      current === 'system' ? 'dark' : current === 'dark' ? 'light' : 'system';
    getStore().setTheme(next);
    await dispatcher.applyTheme(next);
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
    await dispatcher.refreshStatus();
    await dispatcher.refreshBranches();
    await dispatcher.refreshPullRequests();
  },

  async cloneRepo(url: string, dir: string) {
    getStore().setGitOpLoading(true);
    getStore().setError(null);
    try {
      const { path } = await ipcInvoke('git:clone', { url, dir });
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
    await dispatcher.refreshStatus();
    await dispatcher.refreshBranches();
    await dispatcher.refreshPullRequests();
  },

  async refreshStatus() {
    const path = getStore().activeRepoPath;
    if (!path) return;

    getStore().setGitOpLoading(true);
    try {
      const status = await ipcInvoke('git:status', { path });
      getStore().setStatus(status);
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Failed to get status',
      );
    } finally {
      getStore().setGitOpLoading(false);
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

  async removeRepo(path: string) {
    getStore().removeRepo(path);
    await persistRepos();
    getStore().showToast('Repository removed from list');
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
