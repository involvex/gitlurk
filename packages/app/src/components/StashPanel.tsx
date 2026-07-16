import { useEffect, useState } from 'react';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';

export function StashPanel() {
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const stashes = useAppStore((s) => s.stashes);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (activeRepoPath) {
      void dispatcher.refreshStashes();
    }
  }, [activeRepoPath]);

  if (!activeRepoPath) return null;

  return (
    <section className="border-t border-border p-4">
      <h3 className="mb-2 text-sm font-semibold">Stash</h3>
      <div className="mb-3 flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Stash message (optional)"
          className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-primary"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void dispatcher
              .stashPush(message.trim() || undefined)
              .finally(() => setBusy(false));
          }}
          className="rounded-md bg-accent px-2 py-1 text-xs text-white disabled:opacity-50"
        >
          Stash
        </button>
      </div>
      {stashes.length === 0 ? (
        <p className="text-xs text-muted">No stashed changes</p>
      ) : (
        <ul className="max-h-36 space-y-1 overflow-y-auto">
          {stashes.map((entry) => (
            <li
              key={entry.index}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5"
            >
              <span className="truncate text-xs" title={entry.message}>
                {entry.message || `stash@{${entry.index}}`}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void dispatcher
                      .stashPop(entry.index)
                      .finally(() => setBusy(false));
                  }}
                  className="rounded border border-border px-1.5 py-0.5 text-[10px] hover:bg-surface"
                >
                  Pop
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void dispatcher
                      .stashDrop(entry.index)
                      .finally(() => setBusy(false));
                  }}
                  className="rounded border border-border px-1.5 py-0.5 text-[10px] text-danger hover:bg-surface"
                >
                  Drop
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
