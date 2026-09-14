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

/** Module-level lock so StrictMode remounts cannot start two PTYs. */
let spawnInFlight = false;

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

function createXtermMount(host: HTMLDivElement): {
  term: Terminal;
  fitAddon: FitAddon;
  mount: HTMLDivElement;
} {
  const mount = document.createElement('div');
  mount.className = 'h-full w-full';
  host.appendChild(mount);

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
  return { term, fitAddon, mount };
}

/** Skip ConPTY resize when the pane is crushed to 0 by flex layout. */
function safeResize(sessionId: string, cols: number, rows: number) {
  if (sessionId.startsWith('local-error-')) return;
  if (cols < 2 || rows < 1) return;
  void ipcInvoke('terminal:resize', { sessionId, cols, rows }).catch(() => {
    /* session may already be gone */
  });
}

export function TerminalPane() {
  const show = useAppStore((s) => s.showTerminal);
  const terminalHeight = useAppStore((s) => s.terminalHeight);
  const sessions = useAppStore((s) => s.terminalSessions);
  const activeSessionId = useAppStore((s) => s.activeTerminalSessionId);

  const hostRef = useRef<HTMLDivElement>(null);
  const runtimesRef = useRef<Map<string, SessionRuntime>>(new Map());

  function syncVisibility(activeId: string | null) {
    for (const [id, runtime] of runtimesRef.current) {
      const visible = id === activeId;
      runtime.mount.style.display = visible ? 'block' : 'none';
      if (visible) {
        runtime.fitAddon.fit();
        safeResize(id, runtime.term.cols, runtime.term.rows);
        runtime.term.focus();
      }
    }
  }

  async function attachRuntime(
    sessionId: string,
    host: HTMLDivElement,
  ): Promise<SessionRuntime> {
    const { term, fitAddon, mount } = createXtermMount(host);

    const unlisten = await onEvent('terminal-output', (event) => {
      if (event.sessionId !== sessionId) return;
      const runtime = runtimesRef.current.get(sessionId);
      runtime?.term.write(event.data);
    });

    term.onData((data) => {
      void ipcInvoke('terminal:write', { sessionId, data });
    });

    const runtime: SessionRuntime = { term, fitAddon, mount, unlisten };
    runtimesRef.current.set(sessionId, runtime);
    return runtime;
  }

  async function rebindExistingSessions() {
    const host = hostRef.current;
    if (!host) return;
    const store = useAppStore.getState();
    for (const session of store.terminalSessions) {
      if (runtimesRef.current.has(session.id)) continue;
      if (session.id.startsWith('local-error-')) continue;
      try {
        await attachRuntime(session.id, host);
      } catch {
        /* PTY may already be dead — leave tab for user to close */
      }
    }
    syncVisibility(store.activeTerminalSessionId);
  }

  async function spawnSession() {
    if (spawnInFlight || !hostRef.current) return;
    spawnInFlight = true;
    const store = useAppStore.getState();
    const cwd = store.activeRepoPath ?? '.';
    const shell = store.terminalShell;
    const shellPath = shellPathForSpawn(
      shell,
      store.terminalShellPath,
      store.terminalPwshPath,
    );

    const { term, fitAddon, mount } = createXtermMount(hostRef.current);

    try {
      const cols = Math.max(term.cols, 2);
      const rows = Math.max(term.rows, 1);
      const { sessionId } = await ipcInvoke('terminal:spawn', {
        cwd,
        cols,
        rows,
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

      const latest = useAppStore.getState();
      const nextIndex = latest.terminalSessions.length + 1;
      const info: TerminalSessionInfo = {
        id: sessionId,
        title: titleForShell(shell, cwd, nextIndex),
      };
      latest.setTerminalSessions([...latest.terminalSessions, info]);
      latest.setActiveTerminalSessionId(sessionId);
      syncVisibility(sessionId);
    } catch (error) {
      term.writeln(`Failed to start terminal: ${invokeErrorMessage(error)}`);
      const localId = `local-error-${Date.now()}`;
      runtimesRef.current.set(localId, { term, fitAddon, mount });
      const latest = useAppStore.getState();
      const nextIndex = latest.terminalSessions.length + 1;
      latest.setTerminalSessions([
        ...latest.terminalSessions,
        { id: localId, title: titleForShell(shell, cwd, nextIndex) },
      ]);
      latest.setActiveTerminalSessionId(localId);
      syncVisibility(localId);
    } finally {
      spawnInFlight = false;
    }
  }

  async function disposeSession(sessionId: string, killPty: boolean) {
    const runtime = runtimesRef.current.get(sessionId);
    if (runtime) {
      runtime.unlisten?.();
      runtime.term.dispose();
      runtime.mount.remove();
      runtimesRef.current.delete(sessionId);
    }
    if (killPty && !sessionId.startsWith('local-error-')) {
      try {
        await ipcInvoke('terminal:kill', { sessionId });
      } catch {
        /* already gone */
      }
    }
  }

  async function closeSession(sessionId: string) {
    await disposeSession(sessionId, true);

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
    const store = useAppStore.getState();
    const ids = new Set([
      ...runtimesRef.current.keys(),
      ...store.terminalSessions.map((s) => s.id),
    ]);
    for (const id of ids) {
      await disposeSession(id, true);
    }
    useAppStore.getState().setTerminalSessions([]);
    useAppStore.getState().setActiveTerminalSessionId(null);
  }

  // Open pane: ensure at least one session (or rebind after remount).
  // Close pane: tear everything down. Do not kill PTY on incidental remount.
  useEffect(() => {
    if (!show) {
      void closeAllSessions();
      return;
    }
    const store = useAppStore.getState();
    if (store.terminalSessions.length === 0) {
      if (!spawnInFlight) void spawnSession();
    } else if (runtimesRef.current.size === 0) {
      void rebindExistingSessions();
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
      safeResize(id, runtime.term.cols, runtime.term.rows);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [show]);

  if (!show) return null;

  return (
    <div className="shrink-0 border-t border-border bg-surface">
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
            safeResize(id, runtime.term.cols, runtime.term.rows);
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
