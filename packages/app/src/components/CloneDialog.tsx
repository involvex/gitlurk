import { useEffect, useRef, useState } from 'react';
import { parseGitHubRemoteUrl } from '@gitlurk/shared';
import { ipcInvoke } from '../ipc/client';
import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';

type CloneTab = 'https' | 'ssh' | 'cli';

function suggestClonePath(dir: string, url: string): string {
  const parsed = parseGitHubRemoteUrl(url.trim());
  const name = parsed?.repo;
  if (!dir || !name) return '';
  const sep = dir.includes('/') && !dir.includes('\\') ? '/' : '\\';
  return `${dir.replace(/[\\/]+$/, '')}${sep}${name}`;
}

export function CloneDialog() {
  const show = useAppStore((s) => s.showCloneDialog);
  const loading = useAppStore((s) => s.loading);
  const defaultCloneDir = useAppStore((s) => s.defaultCloneDir);
  const username = useAppStore((s) => s.username);
  const [tab, setTab] = useState<CloneTab>('https');
  const [url, setUrl] = useState('https://github.com/owner/repo.git');
  const [localPath, setLocalPath] = useState('');
  const [recurseSubmodules, setRecurseSubmodules] = useState(false);
  const [shallowClone, setShallowClone] = useState(false);
  const [depth, setDepth] = useState('1');
  const [forkFirst, setForkFirst] = useState(false);
  const pathTouchedRef = useRef(false);

  useEffect(() => {
    if (!show) {
      pathTouchedRef.current = false;
      return;
    }
    // While the destination hasn't been manually chosen, follow the repo
    // name from the URL so pasting a new link updates the folder name.
    if (pathTouchedRef.current) return;
    setLocalPath(suggestClonePath(defaultCloneDir, url));
  }, [show, defaultCloneDir, url]);

  if (!show) return null;

  const cliCommand = `gh repo clone ${url.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '')}${
    recurseSubmodules ? ' -- --recurse-submodules' : ''
  }`;

  async function pickDirectory() {
    const dir = await ipcInvoke('dialog:save-directory', {
      title: 'Clone into folder',
      defaultPath: url.split('/').pop()?.replace('.git', ''),
    });
    if (dir) {
      setLocalPath(dir);
      pathTouchedRef.current = true;
      dispatcher.rememberCloneDir(dir);
    }
  }

  async function handleClone() {
    if (!url.trim() || !localPath.trim()) return;
    const parsedDepth = shallowClone ? Number.parseInt(depth, 10) : undefined;
    const options = {
      recurseSubmodules,
      depth:
        typeof parsedDepth === 'number' &&
        Number.isFinite(parsedDepth) &&
        parsedDepth > 0
          ? parsedDepth
          : undefined,
    };
    if (forkFirst) {
      await dispatcher.forkAndClone(url.trim(), localPath.trim(), options);
    } else {
      await dispatcher.cloneRepo(url.trim(), localPath.trim(), options);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface-elevated shadow-xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Clone a repository</h2>
          <button
            type="button"
            onClick={() => useAppStore.getState().setShowCloneDialog(false)}
            className="text-muted hover:text-foreground"
          >
            ✕
          </button>
        </header>

        <div className="border-b border-border px-5">
          <nav className="flex gap-4">
            {(['https', 'ssh', 'cli'] as CloneTab[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setTab(item);
                  if (item === 'ssh') {
                    setUrl('git@github.com:owner/repo.git');
                  } else if (item === 'https') {
                    setUrl('https://github.com/owner/repo.git');
                  }
                }}
                className={`border-b-2 px-1 py-3 text-sm capitalize ${
                  tab === item
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted'
                }`}
              >
                {item === 'cli' ? 'GitHub CLI' : item.toUpperCase()}
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-4 px-5 py-4">
          {tab === 'cli' ? (
            <div>
              <p className="mb-2 text-sm text-muted">
                Run this in your terminal, or switch to HTTPS/SSH to clone
                directly in GitLurk:
              </p>
              <code className="block rounded-md bg-surface px-3 py-2 font-mono text-xs">
                {cliCommand}
              </code>
            </div>
          ) : (
            <label className="block">
              <span className="mb-1 block text-xs text-muted">
                Repository URL
              </span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs text-muted">Local path</span>
            <div className="flex gap-2">
              <input
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="C:\dev\my-repo"
                className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => void pickDirectory()}
                className="rounded-md border border-border px-3 py-2 text-xs hover:bg-surface"
              >
                Browse
              </button>
            </div>
          </label>

          {tab !== 'cli' ? (
            <div className="space-y-3 rounded-md border border-border bg-surface px-3 py-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={recurseSubmodules}
                  onChange={(e) => setRecurseSubmodules(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">
                    Recurse submodules
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Passes <code>--recurse-submodules</code> to git clone.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={shallowClone}
                  onChange={(e) => setShallowClone(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="block flex-1">
                  <span className="block text-sm font-medium">
                    Shallow clone
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Limit history depth (faster for large repos).
                  </span>
                  {shallowClone ? (
                    <input
                      type="number"
                      min={1}
                      value={depth}
                      onChange={(e) => setDepth(e.target.value)}
                      className="mt-2 w-24 rounded-md border border-border bg-surface-elevated px-2 py-1 text-sm"
                    />
                  ) : null}
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={forkFirst && !!username}
                  disabled={!username}
                  onChange={(e) => setForkFirst(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">
                    Fork repository under my account
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {username
                      ? 'Creates a fork via GitHub CLI, then clones your fork and adds the original repository as the upstream remote.'
                      : 'Sign in to GitHub to enable forking.'}
                  </span>
                </span>
              </label>
            </div>
          ) : null}
        </div>

        <footer className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={() => useAppStore.getState().setShowCloneDialog(false)}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface"
          >
            Cancel
          </button>
          {tab !== 'cli' ? (
            <button
              type="button"
              onClick={() => void handleClone()}
              disabled={loading || !url || !localPath}
              className="rounded-md bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {loading
                ? forkFirst
                  ? 'Forking & cloning…'
                  : 'Cloning…'
                : forkFirst && username
                  ? 'Fork & Clone'
                  : 'Clone'}
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
