import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';
import { ResizeHandle } from './ResizeHandle';

type FsEntry = {
  name: string;
  path: string;
  kind: 'file' | 'dir';
};

const README_CANDIDATES = [
  'README.md',
  'Readme.md',
  'readme.md',
  'README',
  'readme',
];

function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown|mdown|mkd)$/i.test(path);
}

function TreeNode({
  entry,
  depth,
  selectedPath,
  expanded,
  childrenByPath,
  onToggle,
  onSelect,
}: {
  entry: FsEntry;
  depth: number;
  selectedPath: string | null;
  expanded: Set<string>;
  childrenByPath: Record<string, FsEntry[]>;
  onToggle: (path: string) => void;
  onSelect: (entry: FsEntry) => void;
}) {
  const isDir = entry.kind === 'dir';
  const isOpen = expanded.has(entry.path);
  const selected = selectedPath === entry.path;
  const children = childrenByPath[entry.path] ?? [];

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          if (isDir) onToggle(entry.path);
          onSelect(entry);
        }}
        className={`flex w-full items-center gap-1 truncate px-2 py-1 text-left font-mono text-xs ${
          selected
            ? 'bg-primary/20 text-primary'
            : 'text-foreground hover:bg-surface'
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <span className="w-3 shrink-0 text-muted">
          {isDir ? (isOpen ? '▾' : '▸') : '·'}
        </span>
        <span className="truncate">{entry.name}</span>
      </button>
      {isDir && isOpen ? (
        <ul>
          {children.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expanded={expanded}
              childrenByPath={childrenByPath}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="markdown-body max-w-none text-sm leading-relaxed text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export function OverviewView() {
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const fileListWidth = useAppStore((s) => s.fileListWidth);
  const [rootEntries, setRootEntries] = useState<FsEntry[]>([]);
  const [childrenByPath, setChildrenByPath] = useState<
    Record<string, FsEntry[]>
  >({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('README');
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewBinary, setPreviewBinary] = useState(false);
  const [previewTruncated, setPreviewTruncated] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (!activeRepoPath) {
      setRootEntries([]);
      setChildrenByPath({});
      setExpanded(new Set());
      setSelectedPath(null);
      setPreviewContent(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const entries = await dispatcher.listRepoDir();
      if (cancelled) return;
      setRootEntries(entries);
      setChildrenByPath({});
      setExpanded(new Set());
      setSelectedPath(null);

      const readme = README_CANDIDATES.find((name) =>
        entries.some(
          (e) =>
            e.kind === 'file' && e.name.toLowerCase() === name.toLowerCase(),
        ),
      );
      if (readme) {
        setLoadingPreview(true);
        const file = await dispatcher.readRepoFile(readme);
        if (cancelled) return;
        setPreviewTitle(readme);
        setPreviewBinary(Boolean(file?.binary));
        setPreviewTruncated(Boolean(file?.truncated));
        setPreviewContent(file?.binary ? null : (file?.content ?? null));
        setLoadingPreview(false);
      } else {
        setPreviewTitle('README');
        setPreviewContent(null);
        setPreviewBinary(false);
        setPreviewTruncated(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeRepoPath]);

  async function toggleDir(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
    if (!childrenByPath[path]) {
      const entries = await dispatcher.listRepoDir(path);
      setChildrenByPath((prev) => ({ ...prev, [path]: entries }));
    }
  }

  async function selectEntry(entry: FsEntry) {
    setSelectedPath(entry.path);
    if (entry.kind === 'dir') return;

    setLoadingPreview(true);
    setPreviewTitle(entry.path);
    const file = await dispatcher.readRepoFile(entry.path);
    setPreviewBinary(Boolean(file?.binary));
    setPreviewTruncated(Boolean(file?.truncated));
    setPreviewContent(file?.binary ? null : (file?.content ?? null));
    setLoadingPreview(false);
  }

  if (!activeRepoPath) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        <div className="text-center">
          <p className="text-lg font-medium">Welcome to GitLurk Desktop</p>
          <p className="mt-2 text-sm">
            Open a local repository or clone from GitHub to begin.
          </p>
        </div>
      </div>
    );
  }

  const showMarkdown =
    previewContent !== null &&
    !previewBinary &&
    (selectedPath === null ||
      isMarkdownPath(selectedPath) ||
      isMarkdownPath(previewTitle) ||
      /^readme$/i.test(previewTitle));

  return (
    <div className="flex min-w-0 flex-1 overflow-hidden">
      <aside
        className="flex shrink-0 flex-col border-r border-border"
        style={{ width: fileListWidth }}
      >
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <h2 className="text-xs font-medium text-muted">Files</h2>
          <button
            type="button"
            onClick={() => void dispatcher.revealInExplorer(activeRepoPath)}
            className="text-[10px] text-primary hover:underline"
          >
            Reveal
          </button>
        </header>
        <ul className="min-h-0 flex-1 overflow-auto py-1">
          {rootEntries.map((entry) => (
            <TreeNode
              key={entry.path}
              entry={entry}
              depth={0}
              selectedPath={selectedPath}
              expanded={expanded}
              childrenByPath={childrenByPath}
              onToggle={(path) => void toggleDir(path)}
              onSelect={(e) => void selectEntry(e)}
            />
          ))}
        </ul>
      </aside>
      <ResizeHandle
        orientation="vertical"
        onDrag={(delta) => dispatcher.resizeFileList(delta)}
      />
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <div>
            <h2 className="text-sm font-semibold">{previewTitle}</h2>
            <p className="text-xs text-muted">Repository overview</p>
          </div>
          {selectedPath ? (
            <button
              type="button"
              onClick={() =>
                void dispatcher.revealInExplorer(
                  `${activeRepoPath}\\${selectedPath.replace(/\//g, '\\')}`,
                )
              }
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-elevated"
            >
              Reveal in Explorer
            </button>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {loadingPreview ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : previewBinary ? (
            <p className="text-sm text-muted">
              Binary file — use Reveal in Explorer to open it.
            </p>
          ) : previewContent === null ? (
            <p className="text-sm text-muted">
              No README found. Select a file in the tree to preview it.
            </p>
          ) : showMarkdown ? (
            <>
              {previewTruncated ? (
                <p className="mb-3 text-xs text-muted">
                  Preview truncated (file exceeds size limit).
                </p>
              ) : null}
              <MarkdownBody content={previewContent} />
            </>
          ) : (
            <>
              {previewTruncated ? (
                <p className="mb-3 text-xs text-muted">
                  Preview truncated (file exceeds size limit).
                </p>
              ) : null}
              <pre className="overflow-auto rounded-md border border-border bg-surface-elevated p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {previewContent}
              </pre>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
