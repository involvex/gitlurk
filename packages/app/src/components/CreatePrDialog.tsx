import { useEffect, useState } from 'react';
import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';

export function CreatePrDialog() {
  const show = useAppStore((s) => s.showCreatePrDialog);
  const loading = useAppStore((s) => s.loading);
  const branches = useAppStore((s) => s.branches);
  const username = useAppStore((s) => s.username);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [head, setHead] = useState('');
  const [base, setBase] = useState('main');
  const [draft, setDraft] = useState(false);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    void (async () => {
      await dispatcher.refreshBranches();
      if (cancelled) return;
      const store = useAppStore.getState();
      const headDefault = store.currentBranch || store.branches[0] || '';
      const preferredBase = store.branches.find(
        (b) => b === 'main' || b === 'master',
      );
      setTitle('');
      setBody('');
      setDraft(false);
      setHead(headDefault);
      setBase(
        preferredBase ??
          (store.branches.find((b) => b !== headDefault) || 'main'),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [show]);

  if (!show) return null;

  const canSubmit =
    Boolean(username) &&
    title.trim().length > 0 &&
    head.trim().length > 0 &&
    base.trim().length > 0 &&
    head !== base;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface-elevated p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Create pull request</h2>
        <p className="mt-1 text-xs text-muted">
          Opens a PR on GitHub for the active repository.
        </p>

        {!username ? (
          <p className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            Sign in to GitHub before creating a pull request.
          </p>
        ) : null}

        <label className="mt-4 block text-xs text-muted">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            placeholder="Summary of your changes"
          />
        </label>

        <label className="mt-3 block text-xs text-muted">
          Description
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            placeholder="Optional details"
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-xs text-muted">
            Head (compare)
            <select
              value={head}
              onChange={(e) => setHead(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            >
              {branches.length === 0 ? (
                <option value={head}>{head || '—'}</option>
              ) : (
                branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="block text-xs text-muted">
            Base
            <select
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            >
              {[base, ...branches.filter((b) => b !== base)]
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={draft}
            onChange={(e) => setDraft(e.target.checked)}
          />
          Create as draft
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => useAppStore.getState().setShowCreatePrDialog(false)}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit || loading}
            onClick={() =>
              void dispatcher.createPullRequest({
                title: title.trim(),
                body: body.trim() || undefined,
                head: head.trim(),
                base: base.trim(),
                draft,
              })
            }
            className="rounded-md bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create PR'}
          </button>
        </div>
      </div>
    </div>
  );
}
