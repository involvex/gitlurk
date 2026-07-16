import { useEffect, useRef } from 'react';
import { onEvent } from '../ipc/client';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';

export function GhRunWatchDialog() {
  const show = useAppStore((s) => s.showGhRunWatch);
  const log = useAppStore((s) => s.ghRunWatchLog);
  const running = useAppStore((s) => s.ghRunWatchRunning);
  const path = useAppStore((s) => s.ghRunWatchPath);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!show) return;

    let unlistenOutput: (() => void) | undefined;
    let unlistenDone: (() => void) | undefined;

    void (async () => {
      unlistenOutput = await onEvent('dev:gh-run-output', (payload) => {
        useAppStore.getState().appendGhRunWatchLog(payload.data);
      });
      unlistenDone = await onEvent('dev:gh-run-done', (payload) => {
        useAppStore.getState().setGhRunWatchRunning(false);
        useAppStore
          .getState()
          .appendGhRunWatchLog(`\n[done] exit code ${payload.exitCode}\n`);
      });
    })();

    return () => {
      unlistenOutput?.();
      unlistenDone?.();
    };
  }, [show]);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [log]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-surface p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Watch CI run</h2>
            {path ? (
              <p className="truncate text-[11px] text-muted" title={path}>
                {path}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {running ? (
              <button
                type="button"
                onClick={() => void dispatcher.stopWatchCiRun()}
                className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-elevated"
              >
                Stop
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void dispatcher.closeWatchCiRun()}
              className="text-xs text-muted hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
        <pre
          ref={preRef}
          className="min-h-[240px] flex-1 overflow-auto rounded bg-surface-elevated p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
        >
          {log || (running ? 'Starting gh run watch…\n' : 'No output yet.\n')}
        </pre>
        <p className="mt-2 text-[10px] text-muted">
          {running ? 'Streaming from gh…' : 'Watch finished'}
        </p>
      </div>
    </div>
  );
}
