import { useEffect, useMemo, useRef, useState } from 'react';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';

interface CommandItem {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  run: () => void | Promise<void>;
}

function scoreMatch(query: string, item: CommandItem): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const haystack =
    `${item.label} ${item.group} ${item.keywords ?? ''}`.toLowerCase();
  if (haystack.includes(q)) return 10;
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => haystack.includes(t)) ? 5 : 0;
}

export function CommandPalette() {
  const show = useAppStore((s) => s.showCommandPalette);
  const repos = useAppStore((s) => s.repos);
  const branches = useAppStore((s) => s.branches);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<CommandItem[]>(() => {
    const base: CommandItem[] = [
      {
        id: 'refresh',
        label: 'Refresh status',
        group: 'Git',
        keywords: 'f5 status',
        run: () => dispatcher.refreshStatus(),
      },
      {
        id: 'commit',
        label: 'Focus commit message',
        group: 'Git',
        run: () => {
          document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
        },
      },
      {
        id: 'pull',
        label: 'Pull',
        group: 'Git',
        run: () => dispatcher.pull(),
      },
      {
        id: 'push',
        label: 'Push',
        group: 'Git',
        run: () => dispatcher.push(),
      },
      {
        id: 'stash',
        label: 'Stash changes',
        group: 'Git',
        run: () => dispatcher.stashPush(),
      },
      {
        id: 'stage-all',
        label: 'Stage all changes',
        group: 'Git',
        run: () => dispatcher.stageAll(),
      },
      {
        id: 'open-repo',
        label: 'Open local repository',
        group: 'Repository',
        run: () => dispatcher.openLocalRepo(),
      },
      {
        id: 'clone',
        label: 'Clone repository',
        group: 'Repository',
        run: () => useAppStore.getState().setShowCloneDialog(true),
      },
      {
        id: 'settings',
        label: 'Open settings',
        group: 'App',
        run: () => useAppStore.getState().setShowSettings(true),
      },
      {
        id: 'terminal',
        label: 'Toggle terminal pane',
        group: 'App',
        run: () => {
          const store = useAppStore.getState();
          store.setShowTerminal(!store.showTerminal);
        },
      },
      {
        id: 'history',
        label: 'Show commit history',
        group: 'Git',
        run: () => useAppStore.getState().setWorkspaceTab('history'),
      },
      {
        id: 'changes',
        label: 'Show changes view',
        group: 'Git',
        run: () => useAppStore.getState().setWorkspaceTab('changes'),
      },
      {
        id: 'discover',
        label: 'Open discover',
        group: 'App',
        run: () => dispatcher.openDiscover('feed'),
      },
    ];

    for (const repo of repos) {
      base.push({
        id: `repo-${repo.path}`,
        label: `Switch to ${repo.name}`,
        group: 'Repositories',
        keywords: repo.path,
        run: () => dispatcher.selectRepo(repo.path),
      });
    }

    for (const branch of branches) {
      base.push({
        id: `branch-${branch}`,
        label: `Checkout ${branch}`,
        group: 'Branches',
        run: () => dispatcher.checkoutBranch(branch),
      });
    }

    return base;
  }, [repos, branches]);

  const filtered = useMemo(() => {
    const scored = commands
      .map((item) => ({ item, score: scoreMatch(query, item) }))
      .filter((entry) => entry.score > 0)
      .sort(
        (a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label),
      );
    return scored.map((entry) => entry.item);
  }, [commands, query]);

  useEffect(() => {
    if (!show) return;
    setQuery('');
    setActiveIndex(0);
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [show]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!show) return null;

  const runSelected = () => {
    const item = filtered[activeIndex];
    if (!item) return;
    useAppStore.getState().setShowCommandPalette(false);
    void item.run();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 pt-[12vh]"
      onClick={() => useAppStore.getState().setShowCommandPalette(false)}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              runSelected();
            } else if (e.key === 'Escape') {
              useAppStore.getState().setShowCommandPalette(false);
            }
          }}
          placeholder="Type a command…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none"
        />
        <ul className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-2 text-xs text-muted">
              No matching commands
            </li>
          ) : (
            filtered.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    useAppStore.getState().setShowCommandPalette(false);
                    void item.run();
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                    index === activeIndex
                      ? 'bg-primary/20 text-primary'
                      : 'hover:bg-surface-elevated'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] text-muted">{item.group}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
