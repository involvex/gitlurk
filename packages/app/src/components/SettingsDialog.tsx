import { useEffect, useState } from 'react';
import type {
  ExternalTool,
  ExternalToolKind,
  ExternalToolTarget,
} from '@gitlurk/shared';
import { resetBuiltinTools } from '@gitlurk/shared';
import { ipcInvoke } from '../ipc/client';
import { dispatcher } from '../dispatcher';
import { hotkeyFromEvent } from '../lib/hotkeys';
import { useAppStore } from '../stores';
import type { AiProvider, TerminalShell, ThemePreset } from '../stores/ui';
import { DeveloperPanel } from './DeveloperPanel';

type SettingsTab =
  'general' | 'theme' | 'hotkeys' | 'tools' | 'ai' | 'developer';

type ToolDraft = {
  id?: string;
  label: string;
  command: string;
  argsText: string;
  kind: ExternalToolKind;
  targets: ExternalToolTarget[];
};

const THEME_PRESETS: Array<{
  id: ThemePreset;
  label: string;
  swatches: [string, string, string];
}> = [
  {
    id: 'github-dark',
    label: 'GitHub Dark',
    swatches: ['#0d1117', '#161b22', '#58a6ff'],
  },
  {
    id: 'github-light',
    label: 'GitHub Light',
    swatches: ['#ffffff', '#f6f8fa', '#0969da'],
  },
  {
    id: 'dim',
    label: 'Dim',
    swatches: ['#1c2128', '#252c35', '#79c0ff'],
  },
  {
    id: 'high-contrast',
    label: 'High contrast',
    swatches: ['#000000', '#ffffff', '#66b3ff'],
  },
];

export function SettingsDialog() {
  const show = useAppStore((s) => s.showSettings);
  const aiProvider = useAppStore((s) => s.aiProvider);
  const aiModel = useAppStore((s) => s.aiModel);
  const kiloBaseUrl = useAppStore((s) => s.kiloBaseUrl);
  const minimizeToTray = useAppStore((s) => s.minimizeToTray);
  const terminalShell = useAppStore((s) => s.terminalShell);
  const terminalShellPath = useAppStore((s) => s.terminalShellPath);
  const terminalPwshPath = useAppStore((s) => s.terminalPwshPath);
  const backgroundFetchEnabled = useAppStore((s) => s.backgroundFetchEnabled);
  const backgroundFetchIntervalMin = useAppStore(
    (s) => s.backgroundFetchIntervalMin,
  );
  const desktopNotifications = useAppStore((s) => s.desktopNotifications);
  const notificationSoundEnabled = useAppStore(
    (s) => s.notificationSoundEnabled,
  );
  const autoRefreshOnChange = useAppStore((s) => s.autoRefreshOnChange);
  const theme = useAppStore((s) => s.theme);
  const themePreset = useAppStore((s) => s.themePreset);
  const hotkeyShowApp = useAppStore((s) => s.hotkeyShowApp);
  const hotkeyCommandPalette = useAppStore((s) => s.hotkeyCommandPalette);
  const externalTools = useAppStore((s) => s.externalTools);

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
  const [draftShowApp, setDraftShowApp] = useState(hotkeyShowApp);
  const [draftPalette, setDraftPalette] = useState(hotkeyCommandPalette);
  const [capturing, setCapturing] = useState<'show' | 'palette' | null>(null);
  const [toolDraft, setToolDraft] = useState<ToolDraft | null>(null);

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
    setDraftShowApp(hotkeyShowApp);
    setDraftPalette(hotkeyCommandPalette);
    setCapturing(null);
    setToolDraft(null);
  }, [
    show,
    aiProvider,
    aiModel,
    kiloBaseUrl,
    hotkeyShowApp,
    hotkeyCommandPalette,
  ]);

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

  useEffect(() => {
    if (!capturing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        setCapturing(null);
        return;
      }
      const next = hotkeyFromEvent(event);
      if (!next) return;
      if (capturing === 'show') setDraftShowApp(next);
      else setDraftPalette(next);
      setCapturing(null);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [capturing]);

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

  const saveHotkeys = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await dispatcher.setHotkeys({
        hotkeyShowApp: draftShowApp.trim() || 'Ctrl+Alt+G',
        hotkeyCommandPalette: draftPalette.trim() || 'Ctrl+Shift+P',
      });
      setStatus('Hotkeys saved');
      useAppStore.getState().showToast('Hotkeys saved');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'theme', label: 'Theme' },
    { id: 'hotkeys', label: 'Hotkeys' },
    { id: 'tools', label: 'Tools' },
    { id: 'ai', label: 'AI' },
    { id: 'developer', label: 'Developer' },
  ];

  const persistTools = (tools: ExternalTool[]) => {
    void dispatcher.setExternalTools(tools);
  };

  const moveTool = (index: number, delta: number) => {
    const next = [...externalTools];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    persistTools(next);
  };

  const toggleTool = (id: string, enabled: boolean) => {
    persistTools(
      externalTools.map((t) => (t.id === id ? { ...t, enabled } : t)),
    );
  };

  const deleteTool = (id: string) => {
    const tool = externalTools.find((t) => t.id === id);
    if (!tool || tool.builtin) return;
    persistTools(externalTools.filter((t) => t.id !== id));
  };

  const openNewTool = () => {
    setToolDraft({
      label: 'Open in …',
      command: '',
      argsText: '{path}',
      kind: 'native',
      targets: ['repo', 'file'],
    });
  };

  const openEditTool = (tool: ExternalTool) => {
    setToolDraft({
      id: tool.id,
      label: tool.label,
      command: tool.command,
      argsText: tool.args.join(' '),
      kind: tool.kind,
      targets: [...tool.targets],
    });
  };

  const saveToolDraft = () => {
    if (!toolDraft) return;
    const label = toolDraft.label.trim();
    const command = toolDraft.command.trim();
    if (!label) {
      useAppStore.getState().setError('Tool label is required');
      return;
    }
    if (toolDraft.kind === 'native' && !command) {
      useAppStore.getState().setError('Command is required for native tools');
      return;
    }
    if (toolDraft.targets.length === 0) {
      useAppStore.getState().setError('Select at least one target');
      return;
    }
    const args =
      toolDraft.kind === 'wsl'
        ? toolDraft.argsText.trim()
          ? [toolDraft.argsText.trim()]
          : ["cd '{wslPath}' && exec bash -l"]
        : toolDraft.argsText.trim().split(/\s+/).filter(Boolean);
    if (toolDraft.id) {
      persistTools(
        externalTools.map((t) =>
          t.id === toolDraft.id
            ? {
                ...t,
                label,
                command: command || t.command,
                args:
                  args.length > 0
                    ? args
                    : toolDraft.kind === 'wsl'
                      ? ["cd '{wslPath}' && exec bash -l"]
                      : ['{path}'],
                kind: toolDraft.kind,
                targets: toolDraft.targets,
              }
            : t,
        ),
      );
    } else {
      const custom: ExternalTool = {
        id: `custom-${crypto.randomUUID()}`,
        label,
        enabled: true,
        targets: toolDraft.targets,
        kind: toolDraft.kind,
        command: command || 'wsl',
        args:
          args.length > 0
            ? args
            : toolDraft.kind === 'wsl'
              ? ["cd '{wslPath}' && exec bash -l"]
              : ['{path}'],
        builtin: false,
      };
      persistTools([...externalTools, custom]);
    }
    setToolDraft(null);
  };

  const toggleDraftTarget = (target: ExternalToolTarget) => {
    if (!toolDraft) return;
    const has = toolDraft.targets.includes(target);
    setToolDraft({
      ...toolDraft,
      targets: has
        ? toolDraft.targets.filter((t) => t !== target)
        : [...toolDraft.targets, target],
    });
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

        <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded px-3 py-1 text-xs ${
                tab === t.id
                  ? 'bg-accent text-white'
                  : 'text-muted hover:bg-surface-elevated'
              }`}
            >
              {t.label}
            </button>
          ))}
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
                Used by the in-app terminal pane. New terminal tabs pick up
                changes; existing tabs keep their shell. Prefer 5.1 or a custom
                path if PowerShell 7 fails under ConPTY (error 0xc0000142).
              </span>
            </label>

            {terminalShell === 'custom' ? (
              <label className="block text-xs font-medium text-muted">
                Custom shell path
                <input
                  value={terminalShellPath}
                  onChange={(e) => {
                    useAppStore.getState().setTerminalShellPath(e.target.value);
                  }}
                  onBlur={() => {
                    void dispatcher.setTerminalShellPath(terminalShellPath);
                  }}
                  placeholder={String.raw`C:\Program Files\Git\bin\bash.exe`}
                  className="mt-1 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground"
                />
                <span className="mt-1 block font-normal text-muted">
                  Full path to an .exe (Git bash, nu, etc.).
                </span>
              </label>
            ) : null}

            {terminalShell === 'pwsh' ? (
              <label className="block text-xs font-medium text-muted">
                Optional pwsh path override
                <input
                  value={terminalPwshPath}
                  onChange={(e) => {
                    useAppStore.getState().setTerminalPwshPath(e.target.value);
                  }}
                  onBlur={() => {
                    void dispatcher.setTerminalPwshPath(terminalPwshPath);
                  }}
                  placeholder={String.raw`C:\Program Files\PowerShell\7\pwsh.exe`}
                  className="mt-1 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground"
                />
                <span className="mt-1 block font-normal text-muted">
                  Leave blank to auto-detect under Program Files\PowerShell.
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
                checked={notificationSoundEnabled}
                onChange={(e) => {
                  void dispatcher.setNotificationSoundEnabled(e.target.checked);
                }}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">
                  Notification sound
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Play a sound when new GitHub notifications arrive.
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

            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-medium">Updates</p>
              <p className="mt-0.5 text-xs text-muted">
                Check releases.gitlurk.dev for signed GitLurk updates.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void dispatcher.checkForUpdates()}
                  className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated"
                >
                  Check for updates
                </button>
              </div>
            </div>

            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-medium">Backup &amp; restore</p>
              <p className="mt-0.5 text-xs text-muted">
                Export settings and your repository list to a JSON file, or
                restore them from a previous backup.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void dispatcher.exportSettings()}
                  className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated"
                >
                  Export settings
                </button>
                <button
                  type="button"
                  onClick={() => void dispatcher.importSettings()}
                  className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated"
                >
                  Import settings
                </button>
              </div>
            </div>
          </div>
        ) : tab === 'theme' ? (
          <div className="space-y-4">
            <label className="block text-xs font-medium text-muted">
              Appearance mode
              <select
                value={theme}
                onChange={(e) => {
                  void dispatcher.applyTheme(
                    e.target.value as 'light' | 'dark' | 'system',
                  );
                }}
                className="mt-1 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground"
              >
                <option value="system">System (GitHub Dark / Light)</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
              <span className="mt-1 block font-normal text-muted">
                System follows OS preference between GitHub Dark and Light. Dim
                and High contrast ignore system and apply directly.
              </span>
            </label>

            <div>
              <p className="mb-2 text-xs font-medium text-muted">
                Color preset
              </p>
              <div className="grid grid-cols-2 gap-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => void dispatcher.applyThemePreset(preset.id)}
                    className={`rounded-md border px-3 py-2 text-left ${
                      themePreset === preset.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-surface-elevated'
                    }`}
                  >
                    <span className="mb-2 flex gap-1">
                      {preset.swatches.map((color) => (
                        <span
                          key={color}
                          className="h-4 w-4 rounded-sm border border-border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                    <span className="text-sm font-medium">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : tab === 'hotkeys' ? (
          <div className="space-y-4">
            <p className="text-xs text-muted">
              Click Capture, then press the desired shortcut. Ctrl+K always
              opens the command palette. F5, Ctrl+Shift+C, Ctrl+Shift+G, and
              Ctrl+B stay fixed.
            </p>

            <label className="block text-xs font-medium text-muted">
              Show / focus app (global)
              <div className="mt-1 flex gap-2">
                <input
                  value={draftShowApp}
                  onChange={(e) => setDraftShowApp(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setCapturing('show')}
                  className="rounded-md border border-border px-3 py-2 text-xs hover:bg-surface-elevated"
                >
                  {capturing === 'show' ? 'Press keys…' : 'Capture'}
                </button>
              </div>
              <span className="mt-1 block font-normal text-muted">
                Works while minimized to tray. Default: Ctrl+Alt+G
              </span>
            </label>

            <label className="block text-xs font-medium text-muted">
              Command palette
              <div className="mt-1 flex gap-2">
                <input
                  value={draftPalette}
                  onChange={(e) => setDraftPalette(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setCapturing('palette')}
                  className="rounded-md border border-border px-3 py-2 text-xs hover:bg-surface-elevated"
                >
                  {capturing === 'palette' ? 'Press keys…' : 'Capture'}
                </button>
              </div>
              <span className="mt-1 block font-normal text-muted">
                In-app only. Also: Ctrl+K. Default: Ctrl+Shift+P
              </span>
            </label>

            {status ? <p className="text-xs text-muted">{status}</p> : null}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveHotkeys()}
                className="rounded-md bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover disabled:opacity-50"
              >
                Save hotkeys
              </button>
            </div>
          </div>
        ) : tab === 'tools' ? (
          <div className="space-y-4">
            <p className="text-xs text-muted">
              Custom CLI tools appear in right-click menus and the command
              palette once enabled below (off by default). Placeholders:{' '}
              <code className="text-foreground">{'{path}'}</code>,{' '}
              <code className="text-foreground">{'{dir}'}</code>,{' '}
              <code className="text-foreground">{'{fileName}'}</code>,{' '}
              <code className="text-foreground">{'{wslPath}'}</code>. Origin CLI
              installs into WSL — see{' '}
              <button
                type="button"
                className="text-primary underline"
                onClick={() =>
                  void ipcInvoke('shell:open-external', {
                    url: 'https://cursor.com/docs/origin/cli',
                  })
                }
              >
                Origin CLI docs
              </button>
              .
            </p>

            <ul className="divide-y divide-border rounded-md border border-border">
              {externalTools.map((tool, index) => (
                <li
                  key={tool.id}
                  className="flex flex-wrap items-center gap-2 px-3 py-2"
                >
                  <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={tool.enabled}
                      onChange={(e) => toggleTool(tool.id, e.target.checked)}
                    />
                    <span className="truncate font-medium">{tool.label}</span>
                    <span className="shrink-0 text-[10px] text-muted">
                      {tool.kind}
                      {tool.builtin ? ' · builtin' : ''}
                    </span>
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveTool(index, -1)}
                      className="rounded border border-border px-2 py-0.5 text-[10px] disabled:opacity-40"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={index === externalTools.length - 1}
                      onClick={() => moveTool(index, 1)}
                      className="rounded border border-border px-2 py-0.5 text-[10px] disabled:opacity-40"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditTool(tool)}
                      className="rounded border border-border px-2 py-0.5 text-[10px]"
                    >
                      Edit
                    </button>
                    {!tool.builtin ? (
                      <button
                        type="button"
                        onClick={() => deleteTool(tool.id)}
                        className="rounded border border-border px-2 py-0.5 text-[10px] text-danger"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            {toolDraft ? (
              <div className="space-y-3 rounded-md border border-border bg-surface-elevated p-3">
                <p className="text-xs font-medium">
                  {toolDraft.id ? 'Edit tool' : 'Add custom tool'}
                </p>
                <label className="block text-xs text-muted">
                  Label
                  <input
                    value={toolDraft.label}
                    onChange={(e) =>
                      setToolDraft({ ...toolDraft, label: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="block text-xs text-muted">
                  Kind
                  <select
                    value={toolDraft.kind}
                    onChange={(e) =>
                      setToolDraft({
                        ...toolDraft,
                        kind: e.target.value as ExternalToolKind,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                  >
                    <option value="native">Native (Windows)</option>
                    <option value="wsl">WSL</option>
                  </select>
                </label>
                {toolDraft.kind === 'native' ? (
                  <label className="block text-xs text-muted">
                    Command
                    <input
                      value={toolDraft.command}
                      onChange={(e) =>
                        setToolDraft({
                          ...toolDraft,
                          command: e.target.value,
                        })
                      }
                      placeholder="code"
                      className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                    />
                  </label>
                ) : null}
                <label className="block text-xs text-muted">
                  {toolDraft.kind === 'wsl'
                    ? 'Bash script (WSL)'
                    : 'Arguments (space-separated)'}
                  <input
                    value={toolDraft.argsText}
                    onChange={(e) =>
                      setToolDraft({
                        ...toolDraft,
                        argsText: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground"
                  />
                </label>
                <div className="flex gap-4 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={toolDraft.targets.includes('repo')}
                      onChange={() => toggleDraftTarget('repo')}
                    />
                    Repo folders
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={toolDraft.targets.includes('file')}
                      onChange={() => toggleDraftTarget('file')}
                    />
                    Files
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setToolDraft(null)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveToolDraft()}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover"
                  >
                    Save tool
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openNewTool()}
                className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated"
              >
                Add custom tool
              </button>
              <button
                type="button"
                onClick={() => persistTools(resetBuiltinTools(externalTools))}
                className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated"
              >
                Reset built-in presets
              </button>
            </div>
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
                <option value="opencode">OpenCode Zen</option>
                <option value="kilo">Kilo</option>
              </select>
            </label>

            <label className="block text-xs font-medium text-muted">
              Model
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm"
              >
                {(models.length > 0 ? models : [model]).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            {provider === 'kilo' ? (
              <label className="block text-xs font-medium text-muted">
                Kilo base URL
                <input
                  value={kiloUrl}
                  onChange={(e) => setKiloUrl(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm"
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
