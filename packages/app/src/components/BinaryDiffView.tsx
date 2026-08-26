import { useEffect, useState } from 'react';
import { ipcInvoke } from '../ipc/client';
import type { DiffKind } from '../stores/git-ops';

interface BlobResponse {
  base64: string | null;
  sizeBytes: number | null;
}

const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
};

interface Side {
  label: string;
  rev: 'HEAD' | ':0' | 'worktree' | null;
}

function sidesFor(kind: DiffKind | null): [Side, Side] {
  switch (kind) {
    case 'staged':
      return [
        { label: 'Before (HEAD)', rev: 'HEAD' },
        { label: 'After (staged)', rev: ':0' },
      ];
    case 'unstaged':
      return [
        { label: 'Before (staged)', rev: ':0' },
        { label: 'After (working tree)', rev: 'worktree' },
      ];
    default:
      return [
        { label: 'Before', rev: null },
        { label: 'After', rev: 'worktree' },
      ];
  }
}

function extOf(file: string): string {
  const idx = file.lastIndexOf('.');
  return idx === -1 ? '' : file.slice(idx + 1).toLowerCase();
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return 'unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Pane({
  side,
  blob,
  mime,
}: {
  side: Side;
  blob: BlobResponse | null;
  mime: string | undefined;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-md border border-border">
      <header className="border-b border-border px-3 py-1.5 text-[10px] font-medium text-muted">
        {side.label}
      </header>
      <div className="flex min-h-48 flex-1 items-center justify-center bg-surface p-2">
        {blob?.base64 && mime ? (
          <img
            src={`data:${mime};base64,${blob.base64}`}
            alt={side.label}
            className="max-h-96 max-w-full object-contain"
          />
        ) : (
          <p className="text-xs text-muted">
            {side.rev === null
              ? 'Added — no previous version'
              : blob === null
                ? 'Loading…'
                : blob.sizeBytes == null
                  ? 'File not found'
                  : `Too large to preview (${formatBytes(blob.sizeBytes)})`}
          </p>
        )}
      </div>
    </div>
  );
}

export function BinaryDiffView({
  path,
  file,
  kind,
}: {
  path: string;
  file: string;
  kind: DiffKind | null;
}) {
  const mime = IMAGE_MIME[extOf(file)];
  const [blobs, setBlobs] = useState<Array<BlobResponse | null>>([null, null]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBlobs([null, null]);
    setError(null);
    const sides = sidesFor(kind);
    void (async () => {
      const next: Array<BlobResponse | null> = [null, null];
      for (let i = 0; i < 2; i += 1) {
        const rev = sides[i].rev;
        if (!rev) continue;
        try {
          next[i] = await ipcInvoke('git:blob-content', { path, file, rev });
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : 'Failed to load blob');
          }
        }
      }
      if (!cancelled) setBlobs(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [path, file, kind]);

  const sides = sidesFor(kind);

  if (!mime) {
    const [, after] = blobs;
    const delta =
      after?.sizeBytes != null
        ? `${formatBytes(after.sizeBytes)} on disk`
        : 'No preview available for this file type.';
    return (
      <div className="rounded-md border border-border bg-surface-elevated px-4 py-6 text-center">
        <p className="text-sm text-muted">Binary file changed</p>
        <p className="mt-1 text-xs text-muted">{delta}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <div className="flex gap-2">
        <Pane side={sides[0]} blob={blobs[0]} mime={mime} />
        <Pane side={sides[1]} blob={blobs[1]} mime={mime} />
      </div>
      <p className="text-[10px] text-muted">
        Before: {formatBytes(blobs[0]?.sizeBytes ?? null)} · After:{' '}
        {formatBytes(blobs[1]?.sizeBytes ?? null)}
      </p>
    </div>
  );
}
