import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useAppStore } from '../stores';

export function TerminalPane() {
  const show = useAppStore((s) => s.showTerminal);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show || !containerRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#0d1117',
        foreground: '#e6edf3',
      },
      fontSize: 13,
      fontFamily: 'Consolas, monospace',
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    term.writeln('MyGit integrated terminal');
    term.writeln(
      'Use the Terminal button to open Windows Terminal in repo folder.',
    );
    term.write('$ ');

    const onResize = () => fitAddon.fit();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      term.dispose();
    };
  }, [show]);

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
