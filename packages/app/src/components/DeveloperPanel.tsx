import { useCallback, useEffect, useState } from 'react';
import { ipcInvoke } from '../ipc/client';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';

type ConfigScope = 'global' | 'local' | 'system';

interface GhRun {
  id: string;
  status: string;
  workflow: string;
  createdAt: string;
  url: string;
}

export function DeveloperPanel() {
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const showToast = useAppStore((s) => s.showToast);

  const [ghInstalled, setGhInstalled] = useState(false);
  const [ghVersion, setGhVersion] = useState<string | null>(null);
  const [ghAuth, setGhAuth] = useState<string | null>(null);
  const [ghLoggedIn, setGhLoggedIn] = useState(false);
  const [ghConfig, setGhConfig] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [ghAliases, setGhAliases] = useState<
    Array<{ name: string; expansion: string }>
  >([]);
  const [runs, setRuns] = useState<GhRun[]>([]);
  const [detailsLoaded, setDetailsLoaded] = useState(false);

  const [gitScope, setGitScope] = useState<ConfigScope>('global');
  const [gitConfig, setGitConfig] = useState<
    Array<{ key: string; value: string; origin?: string }>
  >([]);
  const [gitLoaded, setGitLoaded] = useState(false);
  const [gitFilter, setGitFilter] = useState('');
  const [newGitKey, setNewGitKey] = useState('');
  const [newGitValue, setNewGitValue] = useState('');
  const [newGhKey, setNewGhKey] = useState('');
  const [newGhValue, setNewGhValue] = useState('');
  const [releaseTag, setReleaseTag] = useState('');
  const [releaseTitle, setReleaseTitle] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const repoPath =
    gitScope === 'local' && activeRepoPath ? activeRepoPath : undefined;

  // Fast path only — never block the UI with auth/config/run list on open.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const versionInfo = await ipcInvoke('dev:gh-version', {});
        if (cancelled) return;
        setGhInstalled(versionInfo.installed);
        setGhVersion(versionInfo.version);
      } catch (err) {
        if (!cancelled) {
          setStatus(err instanceof Error ? err.message : 'Failed to detect gh');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDetails = useCallback(async () => {
    if (!ghInstalled) return;
    setLoading(true);
    setStatus(null);
    try {
      const [auth, config, aliases] = await Promise.all([
        ipcInvoke('dev:gh-auth-status', {}),
        ipcInvoke('dev:gh-config-list', {}),
        ipcInvoke('dev:gh-alias-list', {}),
      ]);
      setGhLoggedIn(auth.loggedIn);
      setGhAuth(auth.summary);
      setGhConfig(config.entries);
      setGhAliases(aliases.aliases);
      setDetailsLoaded(true);

      if (activeRepoPath) {
        try {
          const result = await ipcInvoke('dev:gh-run-list', {
            path: activeRepoPath,
            limit: 5,
          });
          setRuns(result.runs);
        } catch {
          setRuns([]);
        }
      }
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : 'Failed to load gh details',
      );
    } finally {
      setLoading(false);
    }
  }, [ghInstalled, activeRepoPath]);

  const loadGitConfig = useCallback(async () => {
    if (gitScope === 'local' && !activeRepoPath) {
      setStatus('Select a repository for local config.');
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const result = await ipcInvoke('dev:git-config-list', {
        scope: gitScope,
        path: repoPath,
      });
      setGitConfig(result.entries);
      setGitLoaded(true);
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : 'Failed to load git config',
      );
      setGitConfig([]);
    } finally {
      setLoading(false);
    }
  }, [gitScope, repoPath, activeRepoPath]);

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusy(true);
    setStatus(null);
    try {
      await action();
      setStatus(label);
      showToast(label);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      setStatus(message);
    } finally {
      setBusy(false);
    }
  };

  const filteredGitConfig = gitConfig.filter((entry) => {
    const q = gitFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      entry.key.toLowerCase().includes(q) ||
      entry.value.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-border p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">GitHub CLI</h3>
          {ghInstalled ? (
            <button
              type="button"
              disabled={loading || busy}
              onClick={() => void loadDetails()}
              className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-elevated disabled:opacity-50"
            >
              {detailsLoaded ? 'Refresh' : 'Load details'}
            </button>
          ) : null}
        </div>
        {!ghInstalled ? (
          <p className="text-xs text-muted">
            gh is not installed.{' '}
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={() =>
                void ipcInvoke('shell:open-external', {
                  url: 'https://cli.github.com',
                })
              }
            >
              Install GitHub CLI
            </button>
          </p>
        ) : (
          <div className="space-y-2 text-xs text-muted">
            <p>{ghVersion ?? 'gh installed'}</p>
            {detailsLoaded ? (
              <p className={ghLoggedIn ? 'text-green-500' : 'text-amber-500'}>
                {ghLoggedIn ? 'Authenticated' : 'Not authenticated'}
              </p>
            ) : (
              <p>Click “Load details” for auth, config, aliases, and runs.</p>
            )}
            {ghAuth ? (
              <pre className="max-h-24 overflow-auto rounded bg-surface-elevated p-2 text-[10px] whitespace-pre-wrap">
                {ghAuth}
              </pre>
            ) : null}
          </div>
        )}

        {ghInstalled ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !activeRepoPath}
              onClick={() => {
                if (!activeRepoPath) return;
                useAppStore.getState().setShowSettings(false);
                void dispatcher.watchCiRun(activeRepoPath);
              }}
              className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-elevated disabled:opacity-50"
            >
              Watch latest run
            </button>
            <button
              type="button"
              disabled={busy || !activeRepoPath}
              onClick={() =>
                void runAction('Repository forked', async () => {
                  await ipcInvoke('dev:gh-repo-fork', {
                    path: activeRepoPath ?? undefined,
                    clone: false,
                  });
                })
              }
              className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-elevated disabled:opacity-50"
            >
              Fork repo
            </button>
          </div>
        ) : null}

        {runs.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs">
            {runs.map((run) => (
              <li
                key={run.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">
                  {run.workflow} · {run.status}
                </span>
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={() =>
                    void ipcInvoke('shell:open-external', { url: run.url })
                  }
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {detailsLoaded && ghInstalled ? (
          <>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                value={newGhKey}
                onChange={(e) => setNewGhKey(e.target.value)}
                placeholder="gh config key"
                className="rounded border border-border bg-surface-elevated px-2 py-1 text-xs"
              />
              <input
                value={newGhValue}
                onChange={(e) => setNewGhValue(e.target.value)}
                placeholder="value"
                className="rounded border border-border bg-surface-elevated px-2 py-1 text-xs"
              />
              <button
                type="button"
                disabled={busy || !newGhKey || !newGhValue}
                onClick={() =>
                  void runAction('gh config updated', async () => {
                    await ipcInvoke('dev:gh-config-set', {
                      key: newGhKey,
                      value: newGhValue,
                    });
                    setNewGhKey('');
                    setNewGhValue('');
                    await loadDetails();
                  })
                }
                className="rounded bg-accent px-2 py-1 text-xs text-white disabled:opacity-50 sm:col-span-2"
              >
                Set gh config
              </button>
            </div>

            {ghAliases.length > 0 ? (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium">Aliases</p>
                <ul className="max-h-24 space-y-1 overflow-auto text-[11px] text-muted">
                  {ghAliases.map((alias) => (
                    <li key={alias.name}>
                      <span className="font-mono text-foreground">
                        {alias.name}
                      </span>
                      {' → '}
                      {alias.expansion}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {ghConfig.length > 0 ? (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium">gh config</p>
                <ul className="max-h-28 space-y-1 overflow-auto text-[11px] text-muted">
                  {ghConfig.slice(0, 20).map((entry) => (
                    <li key={entry.key}>
                      <span className="font-mono text-foreground">
                        {entry.key}
                      </span>
                      {' = '}
                      {entry.value}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="rounded-md border border-border p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Git config</h3>
          <div className="flex items-center gap-2">
            <select
              value={gitScope}
              onChange={(e) => {
                setGitScope(e.target.value as ConfigScope);
                setGitLoaded(false);
                setGitConfig([]);
              }}
              className="rounded border border-border bg-surface-elevated px-2 py-1 text-xs"
            >
              <option value="global">Global</option>
              <option value="local">Local (active repo)</option>
              <option value="system">System</option>
            </select>
            <button
              type="button"
              disabled={loading || busy}
              onClick={() => void loadGitConfig()}
              className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-elevated disabled:opacity-50"
            >
              {gitLoaded ? 'Refresh' : 'Load'}
            </button>
          </div>
        </div>

        {!gitLoaded ? (
          <p className="text-xs text-muted">
            Click Load to list git config (avoids freezing on open).
          </p>
        ) : (
          <>
            <input
              value={gitFilter}
              onChange={(e) => setGitFilter(e.target.value)}
              placeholder="Filter keys or values"
              className="mb-2 w-full rounded border border-border bg-surface-elevated px-2 py-1 text-xs"
            />
            <ul className="mb-3 max-h-36 space-y-1 overflow-auto text-[11px] text-muted">
              {filteredGitConfig.map((entry) => (
                <li key={`${entry.origin ?? ''}:${entry.key}`}>
                  <span className="font-mono text-foreground">{entry.key}</span>
                  {' = '}
                  {entry.value}
                </li>
              ))}
            </ul>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={newGitKey}
                onChange={(e) => setNewGitKey(e.target.value)}
                placeholder="git config key"
                className="rounded border border-border bg-surface-elevated px-2 py-1 text-xs"
              />
              <input
                value={newGitValue}
                onChange={(e) => setNewGitValue(e.target.value)}
                placeholder="value"
                className="rounded border border-border bg-surface-elevated px-2 py-1 text-xs"
              />
              <button
                type="button"
                disabled={busy || !newGitKey}
                onClick={() =>
                  void runAction('git config updated', async () => {
                    await ipcInvoke('dev:git-config-set', {
                      key: newGitKey,
                      value: newGitValue,
                      scope: gitScope,
                      path: repoPath,
                    });
                    setNewGitKey('');
                    setNewGitValue('');
                    await loadGitConfig();
                  })
                }
                className="rounded bg-accent px-2 py-1 text-xs text-white disabled:opacity-50"
              >
                Set git config
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void runAction('Opened git config editor', async () => {
                    await ipcInvoke('dev:git-config-edit', {
                      scope: gitScope,
                      path: repoPath,
                    });
                  })
                }
                className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-elevated disabled:opacity-50"
              >
                Edit config file
              </button>
            </div>
          </>
        )}
      </section>

      {ghInstalled ? (
        <section className="rounded-md border border-border p-3">
          <h3 className="mb-2 text-sm font-semibold">Create release</h3>
          <div className="grid gap-2">
            <input
              value={releaseTag}
              onChange={(e) => setReleaseTag(e.target.value)}
              placeholder="Tag (e.g. v0.1.2)"
              className="rounded border border-border bg-surface-elevated px-2 py-1 text-xs"
            />
            <input
              value={releaseTitle}
              onChange={(e) => setReleaseTitle(e.target.value)}
              placeholder="Title (optional)"
              className="rounded border border-border bg-surface-elevated px-2 py-1 text-xs"
            />
            <textarea
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="Release notes (optional)"
              rows={3}
              className="rounded border border-border bg-surface-elevated px-2 py-1 text-xs"
            />
            <button
              type="button"
              disabled={busy || !releaseTag || !activeRepoPath}
              onClick={() =>
                void runAction('Release created', async () => {
                  const result = await ipcInvoke('dev:gh-release-create', {
                    tag: releaseTag,
                    title: releaseTitle || undefined,
                    notes: releaseNotes || undefined,
                    path: activeRepoPath ?? undefined,
                  });
                  setStatus(result.url || 'Release created');
                })
              }
              className="rounded bg-accent px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              gh release create
            </button>
          </div>
        </section>
      ) : null}

      {loading ? <p className="text-xs text-muted">Loading…</p> : null}
      {status ? <p className="text-xs text-muted">{status}</p> : null}
    </div>
  );
}
