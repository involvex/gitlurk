import { useState } from 'react';
import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';

export function BranchPanel() {
  const branches = useAppStore((s) => s.branches);
  const currentBranch = useAppStore((s) => s.currentBranch);
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const [newBranch, setNewBranch] = useState('');

  if (!activeRepoPath) return null;

  return (
    <aside className="w-56 shrink-0 border-l border-border bg-surface-elevated p-4">
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
      <div className="flex gap-2">
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
    </aside>
  );
}
