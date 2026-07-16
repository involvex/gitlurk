import { useEffect, useState } from 'react';
import { ipcInvoke } from '../ipc/client';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';
import type { AiProvider, TerminalShell } from '../stores/ui';
import { DeveloperPanel } from './DeveloperPanel';

type SettingsTab = 'general' | 'ai' | 'developer';

export function SettingsDialog() {
  const show = useAppStore((s) => s.showSettings);
  const aiProvider = useAppStore((s) => s.aiProvider);
  const aiModel = useAppStore((s) => s.aiModel);
  const kiloBaseUrl = useAppStore((s) => s.kiloBaseUrl);
  const minimizeToTray = useAppStore((s) => s.minimizeToTray);
  const terminalShell = useAppStore((s) => s.terminalShell);
  const terminalShellPath = useAppStore((s) => s.terminalShellPath);
  const backgroundFetchEnabled = useAppStore((s) => s.backgroundFetchEnabled);
  const backgroundFetchIntervalMin = useAppStore(
    (s) => s.backgroundFetchIntervalMin,
  );
  const desktopNotifications = useAppStore((s) => s.desktopNotifications);
  const autoRefreshOnChange = useAppStore((s) => s.autoRefreshOnChange);

  const [tab, setTab] = useState<SettingsTab>('general');
  const [provider, setProvider] = useState<AiProvider>(aiProvider);
  const [model, setModel] = useState(aiModel);
  const [kiloUrl, setKiloUrl] = useState(kiloBaseUrl);
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [hasKey, setHasKey] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);

  useEffect(() => {
    if (!show) return;
    setTab('general');
    setProvider(aiProvider);
    setModel(aiModel);
    setKiloUrl(kiloBaseUrl);
    setApiKey('');
    setStatus(null);
    setAiLoaded(false);
    setModels([]);
  }, [show, aiProvider, aiModel, kiloBaseUrl]);

  useEffect(() => {
    if (!show || tab !== 'ai' || aiLoaded) return;
    let cancelled = false;
    void (async () => {
      try {
        const keyState = await ipcInvoke('ai:has-api-key', {
          provider: aiProvider,
        });
        if (cancelled) return;
        setHasKey(keyState.hasKey);
        try {
          const listed = await ipcInvoke('ai:list-models', {});
          if (!cancelled) setModels(listed.models);
        } catch {
          if (!cancelled) {
            setModels(
              aiProvider === 'kilo'
                ? ['kilo-auto']
                : ['deepseek-v4-flash-free'],
            );
          }
        }
      } finally {
        if (!cancelled) setAiLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [show, tab, aiLoaded, aiProvider]);

  if (!show) return null;

  const save = async () => {
    setBusy(true);
    setStatus(null);
    try {
      if (apiKey.trim()) {
        await ipcInvoke('ai:set-api-key', {
          provider,
          key: apiKey.trim(),
        });
      }
      await dispatcher.saveAiSettings({
        aiProvider: provider,
        aiModel: model,
        kiloBaseUrl: kiloUrl,
      });
      setHasKey(
        apiKey.trim().length > 0 ||
          (await ipcInvoke('ai:has-api-key', { provider })).hasKey,
      );
      setApiKey('');
      setStatus('Settings saved');
      useAppStore.getState().showToast('Settings saved');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setStatus(null);
    try {
      if (apiKey.trim()) {
        await ipcInvoke('ai:set-api-key', {
          provider,
          key: apiKey.trim(),
        });
      }
      await dispatcher.saveAiSettings({
        aiProvider: provider,
        aiModel: model,
        kiloBaseUrl: kiloUrl,
      });
      const result = await ipcInvoke('ai:test-connection', {});
      setStatus(`Connected to ${result.provider}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            type="button"
            onClick={() => useAppStore.getState().setShowSettings(false)}
            className="text-xs text-muted hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="mb-4 flex gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setTab('general')}
            className={`rounded px-3 py-1 text-xs ${
              tab === 'general'
                ? 'bg-accent text-white'
                : 'text-muted hover:bg-surface-elevated'
            }`}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setTab('ai')}
            className={`rounded px-3 py-1 text-xs ${
              tab === 'ai'
                ? 'bg-accent text-white'
                : 'text-muted hover:bg-surface-elevated'
            }`}
          >
            AI
          </button>
          <button
            type="button"
            onClick={() => setTab('developer')}
            className={`rounded px-3 py-1 text-xs ${
              tab === 'developer'
                ? 'bg-accent text-white'
                : 'text-muted hover:bg-surface-elevated'
            }`}
          >
            Developer
          </button>
        </div>

        {tab === 'general' ? (
          <div className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={minimizeToTray}
                onChange={(e) => {
                  void dispatcher.setMinimizeToTray(e.target.checked);
                }}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">
                  Minimize to tray
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Hide from the taskbar when minimized or closed. Restore from
                  the tray icon (Quit exits fully).
                </span>
              </span>
            </label>

            <label className="block text-xs font-medium text-muted">
              Built-in terminal shell
              <select
                value={terminalShell}
                onChange={(e) => {
                  void dispatcher.setTerminalShell(
                    e.target.value as TerminalShell,
                  );
                }}
                className="mt-1 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground"
              >
                <option value="powershell">Windows PowerShell 5.1</option>
                <option value="pwsh">PowerShell 7 (pwsh)</option>
                <option value="cmd">Command Prompt (cmd)</option>
                <option value="custom">Custom executable…</option>
              </select>
              <span className="mt-1 block font-normal text-muted">
                Used by the in-app terminal pane. Re-open the pane after
                changing. Prefer 5.1 or a custom path if PowerShell 7 fails
                under ConPTY (error 0xc0000142).
              </span>
            </label>

            {terminalShell === 'custom' || terminalShell === 'pwsh' ? (
              <label className="block text-xs font-medium text-muted">
                {terminalShell === 'custom'
                  ? 'Custom shell path'
                  : 'Optional pwsh path override'}
                <input
                  value={terminalShellPath}
                  onChange={(e) => {
                    useAppStore.getState().setTerminalShellPath(e.target.value);
                  }}
                  onBlur={() => {
                    void dispatcher.setTerminalShellPath(terminalShellPath);
                  }}
                  placeholder={
                    terminalShell === 'custom'
                      ? String.raw`C:\Program Files\Git\bin\bash.exe`
                      : String.raw`C:\Program Files\PowerShell\7\pwsh.exe`
                  }
                  className="mt-1 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground"
                />
                <span className="mt-1 block font-normal text-muted">
                  {terminalShell === 'custom'
                    ? 'Full path to an .exe (Git bash, nu, etc.).'
                    : 'Leave blank to use Program Files\\PowerShell\\7\\pwsh.exe.'}
                </span>
              </label>
            ) : null}

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={backgroundFetchEnabled}
                onChange={(e) => {
                  void dispatcher.setBackgroundFetchEnabled(e.target.checked);
                }}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">
                  Background fetch
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Periodically fetch from origin and notify when the remote is
                  ahead.
                </span>
              </span>
            </label>

            {backgroundFetchEnabled ? (
              <label className="block text-xs font-medium text-muted">
                Fetch interval (minutes)
                <select
                  value={backgroundFetchIntervalMin}
                  onChange={(e) => {
                    void dispatcher.setBackgroundFetchIntervalMin(
                      Number(e.target.value),
                    );
                  }}
                  className="mt-1 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground"
                >
                  <option value={5}>5</option>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                </select>
              </label>
            ) : null}

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={desktopNotifications}
                onChange={(e) => {
                  void dispatcher.setDesktopNotifications(e.target.checked);
                }}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">
                  Desktop notifications
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Show OS notifications for new GitHub notifications and when
                  the remote branch is ahead after fetch.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={autoRefreshOnChange}
                onChange={(e) => {
                  void dispatcher.setAutoRefreshOnChange(e.target.checked);
                }}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">
                  Auto-refresh on file changes
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Refresh git status when files change in the active repository.
                </span>
              </span>
            </label>
          </div>
        ) : tab === 'ai' ? (
          <div className="space-y-4">
            {!aiLoaded ? (
              <p className="text-xs text-muted">Loading AI settings…</p>
            ) : null}

            <label className="block text-xs font-medium text-muted">
              AI provider
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AiProvider)}
                className="mt-1 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm"
              >
                <option value="opencode">OpenCode Zen (default free)</option>
                <option value="kilo">Kilo gateway</option>
              </select>
            </label>

            <label className="block text-xs font-medium text-muted">
              Model
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm"
              >
                {(models.includes(model) ? models : [model, ...models]).map(
                  (m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ),
                )}
              </select>
            </label>

            {provider === 'kilo' ? (
              <label className="block text-xs font-medium text-muted">
                Kilo base URL
                <input
                  value={kiloUrl}
                  onChange={(e) => setKiloUrl(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm"
                  placeholder="https://api.kilo.ai/v1"
                />
              </label>
            ) : null}

            <label className="block text-xs font-medium text-muted">
              API key {hasKey ? '(saved in keyring)' : '(not set)'}
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm"
                placeholder={
                  hasKey ? '•••••••• (leave blank to keep)' : 'Paste API key'
                }
              />
            </label>

            {status ? <p className="text-xs text-muted">{status}</p> : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void test()}
                className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated disabled:opacity-50"
              >
                Test connection
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="rounded-md bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <DeveloperPanel />
        )}
      </div>
    </div>
  );
}
