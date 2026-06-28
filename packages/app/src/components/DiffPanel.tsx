import { DiffView, DiffModeEnum } from '@git-diff-view/react';
import '@git-diff-view/react/styles/diff-view.css';
import { useAppStore } from '../stores';

export function DiffPanel() {
  const selectedFile = useAppStore((s) => s.selectedFile);
  const diffKind = useAppStore((s) => s.diffKind);
  const fileDiff = useAppStore((s) => s.fileDiff);
  const diffLoading = useAppStore((s) => s.diffLoading);
  const resolvedTheme = useAppStore((s) => s.resolvedTheme);

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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-border px-4 py-2">
        <h3 className="font-mono text-sm">{selectedFile}</h3>
        <p className="text-xs text-muted capitalize">{diffKind}</p>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <DiffView
          data={{ hunks: [fileDiff.patch] }}
          diffViewMode={DiffModeEnum.Split}
          diffViewHighlight
          diffViewTheme={resolvedTheme}
        />
      </div>
    </div>
  );
}
