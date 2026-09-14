import { useEffect, useState } from 'react';
import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';
import { ipcInvoke } from '../ipc/client';
import { joinRepoPath } from '../lib/paths';
import type { DiffKind } from '../stores/git-ops';
import { DiffPanel } from './DiffPanel';
import { ResizeHandle } from './ResizeHandle';
import { ConfirmDialog } from './ConfirmDialog';
import { BoundContextMenu } from './ContextMenu';
import { useContextMenuState } from '../hooks/useContextMenuState';

function FileList({
  title,
  files,
  emptyText,
  kind,
  selectedFile,
  onSelect,
  onContextMenu,
}: {
  title: string;
  files: string[];
  emptyText: string;
  kind: DiffKind;
  selectedFile: string | null;
  onSelect: (file: string, kind: DiffKind) => void;
  onContextMenu: (event: React.MouseEvent, file: string) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface-elevated">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {kind === 'staged' && files.length > 0 ? (
          <button
            type="button"
            onClick={() => void dispatcher.unstageAll()}
            className="text-[10px] text-primary hover:underline"
          >
            Unstage all
          </button>
        ) : null}
        {kind === 'unstaged' && files.length > 0 ? (
          <button
            type="button"
            onClick={() => void dispatcher.stageAll()}
            className="text-[10px] text-primary hover:underline"
          >
            Stage all
          </button>
        ) : null}
      </header>
      {files.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-border">
          {files.map((file) => (
            <li key={file} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelect(file, kind)}
                onContextMenu={(event) => onContextMenu(event, file)}
                className={`min-w-0 flex-1 px-4 py-2 text-left font-mono text-xs ${
                  selectedFile === file
                    ? 'bg-primary/20 text-primary'
                    : 'hover:bg-surface'
                }`}
              >
                {file}
              </button>
              <div className="flex shrink-0 gap-1 pr-2 opacity-0 group-hover:opacity-100">
                {kind === 'staged' ? (
                  <button
                    type="button"
                    title="Unstage"
                    onClick={() => void dispatcher.unstageFiles([file])}
                    className="rounded border border-border px-1.5 py-0.5 text-[10px] hover:bg-surface"
                  >
                    −
                  </button>
                ) : (
                  <button
                    type="button"
                    title="Stage"
                    onClick={() => void dispatcher.stageFiles([file])}
                    className="rounded border border-border px-1.5 py-0.5 text-[10px] hover:bg-surface"
                  >
                    +
                  </button>
                )}
                <button
                  type="button"
                  title="Discard"
                  onClick={() => dispatcher.requestDiscard(file, kind)}
                  className="rounded border border-border px-1.5 py-0.5 text-[10px] text-danger hover:bg-surface"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ChangesView() {
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const status = useAppStore((s) => s.status);
  const loading = useAppStore((s) => s.loading);
  const error = useAppStore((s) => s.error);
  const commitMessage = useAppStore((s) => s.commitMessage);
  const commitTemplate = useAppStore((s) => s.commitTemplate);
  const currentBranch = useAppStore((s) => s.currentBranch);
  const selectedFile = useAppStore((s) => s.selectedFile);
  const fileListWidth = useAppStore((s) => s.fileListWidth);
  const pendingDiscard = useAppStore((s) => s.pendingDiscard);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStyle, setAiStyle] = useState('concise conventional commit');
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [pendingAmend, setPendingAmend] = useState(false);
  const [autocrlfUnset, setAutocrlfUnset] = useState(false);
  const [autocrlfDismissed, setAutocrlfDismissed] = useState(false);
  const {
    state: fileMenu,
    open: openFileMenu,
    close: closeFileMenu,
  } = useContextMenuState<string>();

  useEffect(() => {
    if (!activeRepoPath) return;
    setTemplateLoaded(false);
    setAutocrlfDismissed(false);
    void dispatcher.loadCommitTemplate();
    let cancelled = false;
    void (async () => {
      try {
        const local = await ipcInvoke('dev:git-config-get', {
          key: 'core.autocrlf',
          scope: 'local',
          path: activeRepoPath,
        });
        if (cancelled) return;
        if (local.value != null && local.value !== '') {
          setAutocrlfUnset(false);
          return;
        }
        const global = await ipcInvoke('dev:git-config-get', {
          key: 'core.autocrlf',
          scope: 'global',
        });
        if (!cancelled) {
          setAutocrlfUnset(global.value == null || global.value === '');
        }
      } catch {
        if (!cancelled) setAutocrlfUnset(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeRepoPath]);

  useEffect(() => {
    if (commitTemplate && !commitMessage) {
      useAppStore.getState().setCommitMessage(commitTemplate);
      setTemplateLoaded(true);
    }
  }, [commitTemplate, commitMessage]);

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

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Changes</h2>
          <p className="text-xs text-muted">
            Branch: {currentBranch || status?.branch || 'unknown'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void dispatcher.refreshStatus()}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() =>
              dispatcher.setPendingDiscard({ type: 'discard-all-unstaged' })
            }
            disabled={!status?.unstaged.length}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated disabled:opacity-50"
          >
            Discard unstaged
          </button>
          <button
            type="button"
            onClick={() =>
              dispatcher.setPendingDiscard({ type: 'discard-all-untracked' })
            }
            disabled={!status?.untracked.length}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated disabled:opacity-50"
          >
            Discard untracked
          </button>
          <button
            type="button"
            onClick={() => void dispatcher.pull()}
            disabled={loading}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated disabled:opacity-50"
          >
            Pull
          </button>
          <button
            type="button"
            onClick={() => void dispatcher.push()}
            disabled={loading}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated disabled:opacity-50"
          >
            Push
          </button>
          <button
            type="button"
            onClick={() => void dispatcher.openTerminal()}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated"
          >
            Terminal
          </button>
        </div>
      </header>

      {error ? (
        <div className="mx-6 mt-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
          <button
            type="button"
            onClick={() => useAppStore.getState().setError(null)}
            className="ml-3 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {autocrlfUnset && !autocrlfDismissed ? (
        <div className="mx-6 mt-2 flex items-center justify-between gap-3 rounded-md border border-border bg-surface-elevated px-4 py-2 text-xs text-muted">
          <span>
            <code className="font-mono">core.autocrlf</code> is not configured.
            On Windows,{' '}
            <code className="font-mono">
              git config --global core.autocrlf true
            </code>{' '}
            prevents CRLF/LF line-ending churn across teammates.
          </span>
          <button
            type="button"
            onClick={() => setAutocrlfDismissed(true)}
            className="shrink-0 underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div
          className="space-y-4 overflow-y-auto border-r border-border p-4"
          style={{ width: fileListWidth }}
        >
          <FileList
            title="Staged changes"
            files={status?.staged ?? []}
            emptyText="No staged changes"
            kind="staged"
            selectedFile={selectedFile}
            onSelect={(file, kind) => void dispatcher.loadFileDiff(file, kind)}
            onContextMenu={openFileMenu}
          />
          <FileList
            title="Unstaged changes"
            files={status?.unstaged ?? []}
            emptyText="No unstaged changes"
            kind="unstaged"
            selectedFile={selectedFile}
            onSelect={(file, kind) => void dispatcher.loadFileDiff(file, kind)}
            onContextMenu={openFileMenu}
          />
          <FileList
            title="Untracked files"
            files={status?.untracked ?? []}
            emptyText="No untracked files"
            kind="untracked"
            selectedFile={selectedFile}
            onSelect={(file, kind) => void dispatcher.loadFileDiff(file, kind)}
            onContextMenu={openFileMenu}
          />
        </div>
        <ResizeHandle
          orientation="vertical"
          onDrag={(delta) => dispatcher.resizeFileList(delta)}
        />
        <DiffPanel />
      </div>

      <BoundContextMenu
        state={fileMenu}
        onClose={closeFileMenu}
        items={[
          { id: 'explorer', label: 'Open in Explorer' },
          { id: 'terminal', label: 'Open in Terminal' },
          { id: 'copy-path', label: 'Copy Path' },
        ]}
        onSelect={(id, file) => {
          const absolute = joinRepoPath(activeRepoPath, file);
          if (id === 'explorer') {
            void dispatcher.revealInExplorer(absolute);
          } else if (id === 'terminal') {
            void dispatcher.openTerminalAt(absolute);
          } else if (id === 'copy-path') {
            void dispatcher.copyPathToClipboard(absolute);
          }
        }}
      />

      <footer className="border-t border-border p-6">
        <label
          htmlFor="commit-summary"
          className="mb-2 block text-xs font-medium text-muted"
        >
          Commit summary
        </label>
        {templateLoaded && commitTemplate ? (
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
              Template
            </span>
            <span className="text-[10px] text-muted">
              Pre-filled from commit.template
            </span>
          </div>
        ) : null}
        <textarea
          id="commit-summary"
          value={commitMessage}
          onChange={(e) => {
            useAppStore.getState().setCommitMessage(e.target.value);
            if (templateLoaded) {
              setTemplateLoaded(false);
              useAppStore.getState().setCommitTemplate(null);
            }
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              if (commitMessage.trim() && !loading) {
                void dispatcher.commit();
              }
            }
          }}
          placeholder="Describe your changes (Ctrl+Enter to commit)"
          className="mb-3 h-20 w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={aiStyle}
            onChange={(e) => setAiStyle(e.target.value)}
            className="rounded-md border border-border bg-surface-elevated px-2 py-2 text-xs outline-none focus:border-primary"
            title="AI commit message style"
          >
            <option value="concise conventional commit">Auto</option>
            <option value="conventional commit with scope">Conventional</option>
            <option value="detailed with body">Detailed</option>
            <option value="single line">Single line</option>
          </select>
          <button
            type="button"
            disabled={aiLoading || loading}
            onClick={() => {
              setAiLoading(true);
              void dispatcher
                .generateCommitMessage(aiStyle)
                .finally(() => setAiLoading(false));
            }}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-elevated disabled:opacity-50"
          >
            {aiLoading ? 'Generating…' : 'Generate with AI'}
          </button>
          <button
            type="button"
            onClick={() => void dispatcher.commit()}
            disabled={loading || !commitMessage.trim()}
            className="rounded-md bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Commit to {currentBranch || status?.branch || 'branch'}
          </button>
          <button
            type="button"
            onClick={() => setPendingAmend(true)}
            disabled={loading}
            title="Fold staged changes into the last commit (or reword it)"
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-elevated disabled:opacity-50"
          >
            Amend last commit
          </button>
        </div>
      </footer>

      {pendingAmend ? (
        <ConfirmDialog
          title="Amend last commit?"
          message={
            status?.staged.length
              ? `This folds ${status.staged.length} staged file(s) into the last commit${commitMessage.trim() ? ' and replaces its message' : ', keeping its message'}. Only amend commits that have not been pushed.`
              : `This rewrites the last commit${commitMessage.trim() ? ' with the message you entered' : ' (no message change — it will be kept)'}. Only amend commits that have not been pushed.`
          }
          confirmLabel="Amend"
          onCancel={() => setPendingAmend(false)}
          onConfirm={() => {
            void dispatcher.amendCommit(commitMessage.trim() || undefined);
            setPendingAmend(false);
          }}
        />
      ) : null}
      {pendingDiscard?.type === 'discard-file' ? (
        <ConfirmDialog
          title="Discard changes?"
          message={`Permanently discard changes to ${pendingDiscard.file}?`}
          confirmLabel="Discard"
          onCancel={() => dispatcher.setPendingDiscard(null)}
          onConfirm={() => {
            void dispatcher.discardFile(
              pendingDiscard.file,
              pendingDiscard.kind,
            );
            dispatcher.setPendingDiscard(null);
          }}
        />
      ) : null}
      {pendingDiscard?.type === 'discard-all-unstaged' ? (
        <ConfirmDialog
          title="Discard all unstaged changes?"
          message="This will restore all modified tracked files to HEAD. This cannot be undone."
          confirmLabel="Discard all"
          onCancel={() => dispatcher.setPendingDiscard(null)}
          onConfirm={() => {
            void dispatcher.discardAllUnstaged();
            dispatcher.setPendingDiscard(null);
          }}
        />
      ) : null}
      {pendingDiscard?.type === 'discard-all-untracked' ? (
        <ConfirmDialog
          title="Delete all untracked files?"
          message="This will permanently delete all untracked files and directories."
          confirmLabel="Delete all"
          onCancel={() => dispatcher.setPendingDiscard(null)}
          onConfirm={() => {
            void dispatcher.discardAllUntracked();
            dispatcher.setPendingDiscard(null);
          }}
        />
      ) : null}
    </div>
  );
}
