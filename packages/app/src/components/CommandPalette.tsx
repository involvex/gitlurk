import { useEffect, useMemo, useRef, useState } from 'react';
import { toolsForTarget } from '@gitlurk/shared';
import { dispatcher } from '../dispatcher';
import { joinRepoPath } from '../lib/paths';
import { collectRepoFilePaths, scoreFilePath } from '../lib/repo-file-index';
import { useAppStore } from '../stores';

interface CommandItem {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  scoreBoost?: number;
  run: () => void | Promise<void>;
}

const MAX_FILE_RESULTS = 40;

function scoreMatch(query: string, item: CommandItem): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const haystack =
    `${item.label} ${item.group} ${item.keywords ?? ''}`.toLowerCase();
  if (haystack.includes(q)) return 10;
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => haystack.includes(t)) ? 5 : 0;
}

async function openRepoFile(repoRoot: string, relativePath: string) {
  const absolute = joinRepoPath(repoRoot, relativePath);
  const fileTools = toolsForTarget(
    useAppStore.getState().externalTools,
    'file',
  );
  const tool = fileTools[0];
  if (tool) {
    await dispatcher.runExternalTool(tool, absolute);
    return;
  }
  await dispatcher.revealInExplorer(absolute);
}

export function CommandPalette() {
  const show = useAppStore((s) => s.showCommandPalette);
  const hotkeyCommandPalette = useAppStore((s) => s.hotkeyCommandPalette);
  const repos = useAppStore((s) => s.repos);
  const branches = useAppStore((s) => s.branches);
  const externalTools = useAppStore((s) => s.externalTools);
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [wasOpen, setWasOpen] = useState(false);
  const [repoFiles, setRepoFiles] = useState<string[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesForRepo, setFilesForRepo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (show !== wasOpen) {
    setWasOpen(show);
    if (show) {
      setQuery('');
      setActiveIndex(0);
    }
  }

  useEffect(() => {
    if (!show || !activeRepoPath) {
      if (!show) {
        setRepoFiles([]);
        setFilesForRepo(null);
        setFilesLoading(false);
      }
      return;
    }
    if (filesForRepo === activeRepoPath) return;

    let cancelled = false;
    setFilesLoading(true);
    void (async () => {
      const files = await collectRepoFilePaths((relativePath) =>
        dispatcher.listRepoDir(relativePath),
      );
      if (cancelled) return;
      setRepoFiles(files);
      setFilesForRepo(activeRepoPath);
      setFilesLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [show, activeRepoPath, filesForRepo]);

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
        id: 'overview',
        label: 'Show repository overview',
        group: 'Git',
        run: () => useAppStore.getState().setWorkspaceTab('overview'),
      },
      {
        id: 'changes',
        label: 'Show changes view',
        group: 'Git',
        run: () => useAppStore.getState().setWorkspaceTab('changes'),
      },
      {
        id: 'dashboard',
        label: 'Show repos dashboard',
        group: 'Git',
        keywords: 'repos ahead behind ci status',
        run: () => useAppStore.getState().setWorkspaceTab('dashboard'),
      },
      {
        id: 'create-pr',
        label: 'Create pull request',
        group: 'GitHub',
        keywords: 'pr pull request draft',
        run: () => useAppStore.getState().setShowCreatePrDialog(true),
      },
      {
        id: 'refresh-dashboard',
        label: 'Refresh all repos',
        group: 'Git',
        keywords: 'dashboard fetch ahead behind',
        run: () => void dispatcher.refreshAllRepos(),
      },
      {
        id: 'discover',
        label: 'Open discover',
        group: 'App',
        run: () => dispatcher.openDiscover('feed'),
      },
      {
        id: 'whats-new',
        label: "Show what's new",
        group: 'App',
        keywords: 'changelog release notes',
        run: () => dispatcher.openWhatsNew(),
      },
      {
        id: 'screenshot',
        label: 'Capture screenshot',
        group: 'App',
        keywords: 'screenshot capture png monitor',
        run: () => void dispatcher.captureScreenshot(),
      },
      {
        id: 'gitignore',
        label: 'Edit .gitignore',
        group: 'Git',
        keywords: 'gitignore template',
        run: () => {
          const path = useAppStore.getState().activeRepoPath;
          if (path) {
            useAppStore.getState().openGitignoreEditor(path);
          }
        },
      },
    ];

    if (activeRepoPath) {
      for (const tool of toolsForTarget(externalTools, 'repo')) {
        base.push({
          id: `tool-${tool.id}`,
          label: `${tool.label} (active repo)`,
          group: 'Open with',
          keywords: `external editor ${tool.command} ${tool.label}`,
          run: () => dispatcher.runExternalTool(tool, activeRepoPath),
        });
      }
    }

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

    const trimmed = query.trim();
    if (activeRepoPath && trimmed) {
      const fileHits = repoFiles
        .map((path) => ({ path, score: scoreFilePath(trimmed, path) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
        .slice(0, MAX_FILE_RESULTS);

      for (const hit of fileHits) {
        const repoRoot = activeRepoPath;
        const relativePath = hit.path;
        base.push({
          id: `file-${relativePath}`,
          label: relativePath,
          group: 'Files',
          keywords: relativePath,
          scoreBoost: hit.score,
          run: () => openRepoFile(repoRoot, relativePath),
        });
      }
    }

    return base;
  }, [repos, branches, externalTools, activeRepoPath, repoFiles, query]);

  const filtered = useMemo(() => {
    const scored = commands
      .map((item) => ({
        item,
        score:
          item.group === 'Files' && item.scoreBoost != null
            ? item.scoreBoost
            : scoreMatch(query, item),
      }))
      .filter((entry) => entry.score > 0)
      .sort(
        (a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label),
      );
    return scored.map((entry) => entry.item);
  }, [commands, query]);

  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [show]);

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
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
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
          placeholder="Type a command or file path…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none"
        />
        <p className="border-b border-border px-4 py-1.5 text-[10px] text-muted">
          Ctrl+K
          {hotkeyCommandPalette && hotkeyCommandPalette !== 'Ctrl+K'
            ? ` · ${hotkeyCommandPalette}`
            : ''}
          {activeRepoPath
            ? filesLoading
              ? ' · indexing files…'
              : ` · ${repoFiles.length} files`
            : ''}
        </p>
        <ul className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-2 text-xs text-muted">
              No matching commands or files
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
