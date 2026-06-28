import { useEffect, useState } from 'react';
import { ipcInvoke } from '../ipc/client';
import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';

interface MarketplacePlugin {
  id: string;
  name: string;
  version: string;
}

export function PluginsPanel() {
  const show = useAppStore((s) => s.showPlugins);
  const [marketplace, setMarketplace] = useState<MarketplacePlugin[]>([]);
  const [installed, setInstalled] = useState<MarketplacePlugin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) return;

    void (async () => {
      setLoading(true);
      try {
        const [catalog, local] = await Promise.all([
          ipcInvoke('plugins:list-marketplace', {}),
          ipcInvoke('plugins:list-installed', {}),
        ]);
        setMarketplace(catalog.plugins);
        setInstalled(local.plugins);
      } catch (error) {
        useAppStore
          .getState()
          .setError(
            error instanceof Error ? error.message : 'Failed to load plugins',
          );
      } finally {
        setLoading(false);
      }
    })();
  }, [show]);

  if (!show) return null;

  const installedIds = new Set(installed.map((plugin) => plugin.id));

  return (
    <div className="border-t border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-medium text-muted">Plugins</span>
        <button
          type="button"
          onClick={() => useAppStore.getState().setShowPlugins(false)}
          className="text-xs text-muted hover:text-foreground"
        >
          Close
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto px-4 pb-4">
        {loading ? (
          <p className="text-xs text-muted">Loading plugins…</p>
        ) : marketplace.length === 0 ? (
          <p className="text-xs text-muted">
            No plugins in marketplace catalog
          </p>
        ) : (
          <ul className="space-y-2">
            {marketplace.map((plugin) => (
              <li
                key={plugin.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{plugin.name}</p>
                  <p className="text-xs text-muted">
                    {plugin.id} · v{plugin.version}
                  </p>
                </div>
                {installedIds.has(plugin.id) ? (
                  <button
                    type="button"
                    onClick={() => void dispatcher.invokePlugin(plugin.id)}
                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-elevated"
                  >
                    Run
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void dispatcher.installPlugin(plugin.id)}
                    className="rounded-md bg-accent px-2 py-1 text-xs text-white hover:bg-accent-hover"
                  >
                    Install
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
