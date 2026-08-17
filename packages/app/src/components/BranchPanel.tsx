import { useState } from 'react';
import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';
import { ConfirmDialog } from './ConfirmDialog';

export function BranchPanel() {
  const branches = useAppStore((s) => s.branches);
  const currentBranch = useAppStore((s) => s.currentBranch);
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const tags = useAppStore((s) => s.tags);
  const [newBranch, setNewBranch] = useState('');
  const [newTag, setNewTag] = useState('');
  const [tagMessage, setTagMessage] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  if (!activeRepoPath) return null;

  return (
    <aside className="shrink-0 border-l border-border bg-surface-elevated p-4">
      <h3 className="mb-3 text-sm font-semibold">Branches</h3>
      <ul className="mb-4 max-h-48 space-y-1 overflow-y-auto">
        {branches.map((branch) => (
          <li key={branch}>
            <button
              type="button"
              onClick={() => void dispatcher.checkoutBranch(branch)}
              className={`w-full rounded-md px-2 py-1.5 text-left text-xs ${
                branch === currentBranch
                  ? 'bg-primary/20 text-primary'
                  : 'hover:bg-surface'
              }`}
            >
              {branch}
            </button>
          </li>
        ))}
      </ul>
      <div className="mb-6 flex gap-2">
        <input
          value={newBranch}
          onChange={(e) => setNewBranch(e.target.value)}
          placeholder="new-branch"
          className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => {
            void dispatcher.createBranch(newBranch);
            setNewBranch('');
          }}
          className="rounded-md bg-accent px-2 py-1 text-xs text-white"
        >
          Add
        </button>
      </div>

      <h3 className="mb-3 text-sm font-semibold">Tags</h3>
      <ul className="mb-4 max-h-48 space-y-1 overflow-y-auto">
        {tags.map((tag) => (
          <li
            key={tag.name}
            className="flex items-center justify-between gap-1"
          >
            <span className="min-w-0 flex-1 truncate text-xs">
              {tag.name}
              {tag.message ? (
                <span className="ml-1 text-muted">
                  — {tag.message.split('\n')[0]}
                </span>
              ) : null}
            </span>
            <button
              type="button"
              onClick={() => setPendingDelete(tag.name)}
              className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-danger hover:bg-surface"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="tag-name"
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-primary"
        />
        <input
          value={tagMessage}
          onChange={(e) => setTagMessage(e.target.value)}
          placeholder="message (optional)"
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => {
            void dispatcher.createTag(newTag, tagMessage);
            setNewTag('');
            setTagMessage('');
          }}
          className="rounded-md bg-accent px-2 py-1 text-xs text-white"
        >
          Create tag
        </button>
      </div>

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete tag?"
          message={`Permanently delete tag ${pendingDelete}?`}
          confirmLabel="Delete"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            void dispatcher.deleteTag(pendingDelete);
            setPendingDelete(null);
          }}
        />
      ) : null}
    </aside>
  );
}
