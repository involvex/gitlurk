import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { ipcInvoke, onEvent } from '../ipc/client';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';
import type { TerminalSessionInfo } from '../stores/ui';

type SessionRuntime = {
  term: Terminal;
  fitAddon: FitAddon;
  mount: HTMLDivElement;
  unlisten?: () => void;
};

function invokeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'unknown error';
}

function shellPathForSpawn(
  shell: string,
  customPath: string,
  pwshPath: string,
): string | undefined {
  if (shell === 'custom') return customPath.trim() || undefined;
  if (shell === 'pwsh') return pwshPath.trim() || undefined;
  return undefined;
}

function titleForShell(shell: string, cwd: string, index: number): string {
  const base = cwd.split(/[/\\]/).filter(Boolean).pop() || 'Terminal';
  const label =
    shell === 'powershell'
      ? 'ps'
      : shell === 'pwsh'
        ? 'pwsh'
        : shell === 'cmd'
          ? 'cmd'
          : 'shell';
  return `${base} (${label}${index > 1 ? ` ${index}` : ''})`;
}

export function TerminalPane() {
  const show = useAppStore((s) => s.showTerminal);
  const terminalHeight = useAppStore((s) => s.terminalHeight);
  const sessions = useAppStore((s) => s.terminalSessions);
  const activeSessionId = useAppStore((s) => s.activeTerminalSessionId);

  const hostRef = useRef<HTMLDivElement>(null);
  const runtimesRef = useRef<Map<string, SessionRuntime>>(new Map());
  const spawningRef = useRef(false);

  async function spawnSession() {
    if (spawningRef.current || !hostRef.current) return;
    spawningRef.current = true;
    const store = useAppStore.getState();
    const cwd = store.activeRepoPath ?? '.';
    const shell = store.terminalShell;
    const shellPath = shellPathForSpawn(
      shell,
      store.terminalShellPath,
      store.terminalPwshPath,
    );

    const mount = document.createElement('div');
    mount.className = 'h-full w-full';
    hostRef.current.appendChild(mount);

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
    term.open(mount);
    fitAddon.fit();

    try {
      const { sessionId } = await ipcInvoke('terminal:spawn', {
        cwd,
        cols: term.cols,
        rows: term.rows,
        shell,
        shellPath,
      });

      const unlisten = await onEvent('terminal-output', (event) => {
        if (event.sessionId !== sessionId) return;
        const runtime = runtimesRef.current.get(sessionId);
        runtime?.term.write(event.data);
      });

      term.onData((data) => {
        void ipcInvoke('terminal:write', { sessionId, data });
      });

      runtimesRef.current.set(sessionId, { term, fitAddon, mount, unlisten });

      const nextIndex = store.terminalSessions.length + 1;
      const info: TerminalSessionInfo = {
        id: sessionId,
        title: titleForShell(shell, cwd, nextIndex),
      };
      store.setTerminalSessions([...store.terminalSessions, info]);
      store.setActiveTerminalSessionId(sessionId);
      syncVisibility(sessionId);
    } catch (error) {
      term.writeln(`Failed to start terminal: ${invokeErrorMessage(error)}`);
      // Keep a disposable local-only tab so the error is visible.
      const localId = `local-error-${Date.now()}`;
      runtimesRef.current.set(localId, { term, fitAddon, mount });
      const nextIndex = store.terminalSessions.length + 1;
      store.setTerminalSessions([
        ...store.terminalSessions,
        { id: localId, title: titleForShell(shell, cwd, nextIndex) },
      ]);
      store.setActiveTerminalSessionId(localId);
      syncVisibility(localId);
    } finally {
      spawningRef.current = false;
    }
  }

  function syncVisibility(activeId: string | null) {
    for (const [id, runtime] of runtimesRef.current) {
      const visible = id === activeId;
      runtime.mount.style.display = visible ? 'block' : 'none';
      if (visible) {
        runtime.fitAddon.fit();
        void ipcInvoke('terminal:resize', {
          sessionId: id,
          cols: runtime.term.cols,
          rows: runtime.term.rows,
        }).catch(() => {
          /* local-error sessions have no PTY */
        });
        runtime.term.focus();
      }
    }
  }

  async function disposeSession(sessionId: string) {
    const runtime = runtimesRef.current.get(sessionId);
    if (runtime) {
      runtime.unlisten?.();
      runtime.term.dispose();
      runtime.mount.remove();
      runtimesRef.current.delete(sessionId);
    }
    if (!sessionId.startsWith('local-error-')) {
      try {
        await ipcInvoke('terminal:kill', { sessionId });
      } catch {
        /* already gone */
      }
    }
  }

  async function closeSession(sessionId: string) {
    await disposeSession(sessionId);

    const store = useAppStore.getState();
    const remaining = store.terminalSessions.filter((s) => s.id !== sessionId);
    store.setTerminalSessions(remaining);
    if (remaining.length === 0) {
      store.setActiveTerminalSessionId(null);
      store.setShowTerminal(false);
      return;
    }
    const nextActive =
      store.activeTerminalSessionId === sessionId
        ? (remaining[remaining.length - 1]?.id ?? null)
        : store.activeTerminalSessionId;
    store.setActiveTerminalSessionId(nextActive);
    syncVisibility(nextActive);
  }

  async function closeAllSessions() {
    const ids = [...runtimesRef.current.keys()];
    for (const id of ids) {
      await disposeSession(id);
    }
    useAppStore.getState().setTerminalSessions([]);
    useAppStore.getState().setActiveTerminalSessionId(null);
  }

  // Open pane: ensure at least one session. Close pane: tear everything down.
  useEffect(() => {
    if (!show) {
      void closeAllSessions();
      return;
    }
    if (useAppStore.getState().terminalSessions.length === 0) {
      void spawnSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to pane visibility
  }, [show]);

  useEffect(() => {
    if (!show) return;
    syncVisibility(activeSessionId);
  }, [show, activeSessionId]);

  useEffect(() => {
    if (!show) return;
    const onResize = () => {
      const id = useAppStore.getState().activeTerminalSessionId;
      if (!id) return;
      const runtime = runtimesRef.current.get(id);
      if (!runtime) return;
      runtime.fitAddon.fit();
      void ipcInvoke('terminal:resize', {
        sessionId: id,
        cols: runtime.term.cols,
        rows: runtime.term.rows,
      }).catch(() => undefined);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [show]);

  if (!show) return null;

  return (
    <div className="border-t border-border bg-surface">
      <div
        role="separator"
        aria-orientation="horizontal"
        onPointerDown={(event) => {
          const startY = event.clientY;
          const startH = useAppStore.getState().terminalHeight;
          const onMove = (e: PointerEvent) => {
            const delta = startY - e.clientY;
            dispatcher.resizeTerminal(delta, startH);
            const id = useAppStore.getState().activeTerminalSessionId;
            if (!id) return;
            const runtime = runtimesRef.current.get(id);
            if (!runtime) return;
            runtime.fitAddon.fit();
            void ipcInvoke('terminal:resize', {
              sessionId: id,
              cols: runtime.term.cols,
              rows: runtime.term.rows,
            }).catch(() => undefined);
          };
          const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            void dispatcher.persistPanelSettings();
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        }}
        className="h-1 cursor-row-resize bg-border/60 hover:bg-primary/50"
      />
      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs ${
                session.id === activeSessionId
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <button
                type="button"
                onClick={() =>
                  useAppStore.getState().setActiveTerminalSessionId(session.id)
                }
                className="max-w-[10rem] truncate"
                title={session.title}
              >
                {session.title}
              </button>
              <button
                type="button"
                title="Close terminal"
                onClick={() => void closeSession(session.id)}
                className="text-muted hover:text-danger"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => void spawnSession()}
            className="shrink-0 rounded px-2 py-1 text-xs text-muted hover:bg-surface-elevated hover:text-foreground"
            title="New terminal"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={() => useAppStore.getState().setShowTerminal(false)}
          className="shrink-0 px-2 text-xs text-muted hover:text-foreground"
        >
          Close
        </button>
      </div>
      <div
        ref={hostRef}
        className="relative px-2 pb-2"
        style={{ height: terminalHeight }}
      />
    </div>
  );
}
