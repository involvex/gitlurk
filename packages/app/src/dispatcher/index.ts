import { parseGitHubRemoteUrl } from '@mygit/shared';
import { ipcInvoke, onEvent } from '../ipc/client';
import { useAppStore } from '../stores';

function getStore() {
  return useAppStore.getState();
}

async function persistRepos() {
  const repos = getStore().repos.map((r) => r.path);
  await ipcInvoke('app:save-repos', { repos });
}

export const dispatcher = {
  async initialize() {
    const [{ repos }, { theme }, auth] = await Promise.all([
      ipcInvoke('app:get-repos', {}),
      ipcInvoke('app:get-theme', {}),
      ipcInvoke('auth:get-token', {}),
    ]);

    getStore().setRepos(
      repos.map((path) => ({
        path,
        name: path.split(/[/\\]/).pop() ?? path,
      })),
    );
    getStore().setTheme(theme);
    getStore().setAuth(auth.token, auth.username);
    await dispatcher.applyTheme(theme);

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
    getStore().setAuthenticating(true);
    try {
      const device = await ipcInvoke('auth:github-device-start', {});
      getStore().showToast(
        `Enter code ${device.userCode} at ${device.verificationUri}`,
      );
      await ipcInvoke('shell:open-external', {
        url: device.verificationUri,
      });

      const deadline = Date.now() + device.expiresIn * 1000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, device.interval * 1000));
        const result = await ipcInvoke('auth:github-device-poll', {
          deviceCode: device.deviceCode,
        });
        if (result.token) {
          const auth = await ipcInvoke('auth:get-token', {});
          getStore().setAuth(auth.token, auth.username);
          getStore().showToast(`Signed in as ${auth.username ?? 'user'}`);
          return;
        }
        if (result.error) {
          throw new Error(result.error);
        }
      }
      throw new Error('Device authorization timed out');
    } catch (error) {
      getStore().setError(
        error instanceof Error ? error.message : 'Sign in failed',
      );
    } finally {
      getStore().setAuthenticating(false);
    }
  },

  async signOut() {
    await ipcInvoke('auth:logout', {});
    getStore().setAuth(null, null);
  },

  async openTerminal() {
    const path = getStore().activeRepoPath;
    if (!path) return;
    await ipcInvoke('shell:open-terminal', { path });
  },

  async handleUrlAction(
    action: import('@mygit/shared').UrlAction,
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
          await dispatcher.refreshStatus();
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
