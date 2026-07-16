import { useMemo } from 'react';
import { DiffView, DiffModeEnum } from '@git-diff-view/react';
import '@git-diff-view/react/styles/diff-view.css';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';

function splitDiffHunks(patch: string): string[] {
  const lines = patch.split('\n');
  const header: string[] = [];
  const hunks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (
      line.startsWith('diff --git') ||
      line.startsWith('---') ||
      line.startsWith('+++') ||
      line.startsWith('index ') ||
      line.startsWith('new file mode') ||
      line.startsWith('deleted file mode')
    ) {
      if (current.length === 0) {
        header.push(line);
      }
      continue;
    }
    if (line.startsWith('@@')) {
      if (current.length > 0) {
        hunks.push([...header, ...current].join('\n'));
        current = [];
      }
      current.push(line);
      continue;
    }
    if (current.length > 0) {
      current.push(line);
    }
  }
  if (current.length > 0) {
    hunks.push([...header, ...current].join('\n'));
  }
  return hunks.length > 0 ? hunks : [patch];
}

export function DiffPanel() {
  const selectedFile = useAppStore((s) => s.selectedFile);
  const diffKind = useAppStore((s) => s.diffKind);
  const fileDiff = useAppStore((s) => s.fileDiff);
  const diffLoading = useAppStore((s) => s.diffLoading);
  const resolvedTheme = useAppStore((s) => s.resolvedTheme);

  const hunks = useMemo(
    () => (fileDiff?.patch ? splitDiffHunks(fileDiff.patch) : []),
    [fileDiff?.patch],
  );

  if (!selectedFile) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Select a file to view its diff
      </div>
    );
  }

  if (diffLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Loading diff…
      </div>
    );
  }

  if (!fileDiff) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        No diff available
      </div>
    );
  }

  if (fileDiff.isBinary) {
    return (
      <div className="flex h-full flex-col p-4">
        <header className="mb-3 border-b border-border pb-2">
          <h3 className="font-mono text-sm">{selectedFile}</h3>
          <p className="text-xs text-muted capitalize">{diffKind} · binary</p>
        </header>
        <p className="text-sm text-muted">Binary file changed</p>
      </div>
    );
  }

  const canStageHunks =
    diffKind === 'unstaged' ||
    diffKind === 'untracked' ||
    diffKind === 'staged';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-border px-4 py-2">
        <h3 className="font-mono text-sm">{selectedFile}</h3>
        <p className="text-xs text-muted capitalize">{diffKind}</p>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {canStageHunks && hunks.length > 1 ? (
          <div className="space-y-4">
            {hunks.map((hunk, index) => (
              <div
                key={`${selectedFile}-hunk-${index}`}
                className="rounded-md border border-border"
              >
                <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                  <span className="text-[10px] text-muted">
                    Hunk {index + 1}
                  </span>
                  {diffKind !== 'staged' ? (
                    <button
                      type="button"
                      onClick={() => void dispatcher.stageHunk(hunk)}
                      className="rounded border border-border px-2 py-0.5 text-[10px] hover:bg-surface-elevated"
                    >
                      Stage hunk
                    </button>
                  ) : null}
                </div>
                <DiffView
                  data={{ hunks: [hunk] }}
                  diffViewMode={DiffModeEnum.Split}
                  diffViewHighlight
                  diffViewTheme={resolvedTheme}
                />
              </div>
            ))}
          </div>
        ) : (
          <DiffView
            data={{ hunks: [fileDiff.patch] }}
            diffViewMode={DiffModeEnum.Split}
            diffViewHighlight
            diffViewTheme={resolvedTheme}
          />
        )}
      </div>
    </div>
  );
}
