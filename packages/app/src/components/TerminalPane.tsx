import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { ipcInvoke, onEvent } from '../ipc/client';
import { useAppStore } from '../stores';

export function TerminalPane() {
  const show = useAppStore((s) => s.showTerminal);
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!show || !containerRef.current) return;

    let disposed = false;
    let unlisten: (() => void) | undefined;

    const term = new Terminal({
      theme: {
        background: '#0d1117',
        foreground: '#e6edf3',
      },
      fontSize: 13,
      fontFamily: 'Consolas, monospace',
      cursorBlink: true,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    const cwd = activeRepoPath ?? '.';
    const cols = term.cols;
    const rows = term.rows;

    const onResize = () => {
      fitAddon.fit();
      if (!sessionIdRef.current) return;
      void ipcInvoke('terminal:resize', {
        sessionId: sessionIdRef.current,
        cols: term.cols,
        rows: term.rows,
      });
    };

    void (async () => {
      try {
        const { sessionId } = await ipcInvoke('terminal:spawn', {
          cwd,
          cols,
          rows,
        });
        if (disposed) {
          await ipcInvoke('terminal:kill', { sessionId });
          return;
        }
        sessionIdRef.current = sessionId;

        unlisten = await onEvent('terminal-output', (event) => {
          if (event.sessionId === sessionIdRef.current) {
            term.write(event.data);
          }
        });

        term.onData((data) => {
          if (!sessionIdRef.current) return;
          void ipcInvoke('terminal:write', {
            sessionId: sessionIdRef.current,
            data,
          });
        });

        window.addEventListener('resize', onResize);
      } catch (error) {
        term.writeln(
          `Failed to start terminal: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    })();

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      unlisten?.();
      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      if (sessionId) {
        void ipcInvoke('terminal:kill', { sessionId });
      }
      term.dispose();
    };
  }, [show, activeRepoPath]);

  if (!show) return null;

  return (
    <div className="border-t border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-medium text-muted">Terminal</span>
        <button
          type="button"
          onClick={() => useAppStore.getState().setShowTerminal(false)}
          className="text-xs text-muted hover:text-foreground"
        >
          Close
        </button>
      </div>
      <div ref={containerRef} className="h-48 px-2 pb-2" />
    </div>
  );
}
