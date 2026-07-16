import { useEffect, useState } from 'react';
import { ipcInvoke } from '../ipc/client';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';
import type { AiProvider } from '../stores/ui';
import { DeveloperPanel } from './DeveloperPanel';

type SettingsTab = 'general' | 'ai' | 'developer';

export function SettingsDialog() {
  const show = useAppStore((s) => s.showSettings);
  const aiProvider = useAppStore((s) => s.aiProvider);
  const aiModel = useAppStore((s) => s.aiModel);
  const kiloBaseUrl = useAppStore((s) => s.kiloBaseUrl);
  const minimizeToTray = useAppStore((s) => s.minimizeToTray);

  const [tab, setTab] = useState<SettingsTab>('general');
  const [provider, setProvider] = useState<AiProvider>(aiProvider);
  const [model, setModel] = useState(aiModel);
  const [kiloUrl, setKiloUrl] = useState(kiloBaseUrl);
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [hasKey, setHasKey] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!show) return;
    setTab('general');
    setProvider(aiProvider);
    setModel(aiModel);
    setKiloUrl(kiloBaseUrl);
    setApiKey('');
    setStatus(null);
    void (async () => {
      const keyState = await ipcInvoke('ai:has-api-key', {
        provider: aiProvider,
      });
      setHasKey(keyState.hasKey);
      try {
        const listed = await ipcInvoke('ai:list-models', {});
        setModels(listed.models);
      } catch {
        setModels(
          aiProvider === 'kilo' ? ['kilo-auto'] : ['deepseek-v4-flash-free'],
        );
      }
    })();
  }, [show, aiProvider, aiModel, kiloBaseUrl]);

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
          </div>
        ) : tab === 'ai' ? (
          <div className="space-y-4">
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
