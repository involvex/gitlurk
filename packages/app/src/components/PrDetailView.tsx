import { useMemo, useState } from 'react';
import { DiffView, DiffModeEnum } from '@git-diff-view/react';
import '@git-diff-view/react/styles/diff-view.css';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';

function reviewStateLabel(state: string): string {
  switch (state.toUpperCase()) {
    case 'APPROVED':
      return 'Approved';
    case 'CHANGES_REQUESTED':
      return 'Changes requested';
    case 'COMMENTED':
      return 'Commented';
    case 'DISMISSED':
      return 'Dismissed';
    case 'PENDING':
      return 'Pending';
    default:
      return state;
  }
}

function checkBadge(status: string, conclusion: string | null): string {
  if (status === 'completed') {
    if (conclusion === 'success') return '✓';
    if (conclusion === 'failure') return '✗';
    if (conclusion === 'cancelled') return '⊘';
    return conclusion ?? 'done';
  }
  if (status === 'in_progress' || status === 'queued') return '…';
  return status;
}

export function PrDetailView() {
  const loading = useAppStore((s) => s.pullDetailLoading);
  const detail = useAppStore((s) => s.pullDetail);
  const files = useAppStore((s) => s.pullFiles);
  const reviews = useAppStore((s) => s.pullReviews);
  const checks = useAppStore((s) => s.pullChecks);
  const selectedFile = useAppStore((s) => s.pullSelectedFile);
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const gitLoading = useAppStore((s) => s.loading);
  const resolvedTheme = useAppStore((s) => s.resolvedTheme);
  const pullNumber = useAppStore((s) => s.activePullNumber);

  const [reviewBody, setReviewBody] = useState('');

  const selected = useMemo(
    () => files.find((f) => f.filename === selectedFile) ?? null,
    [files, selectedFile],
  );

  const patchForView = useMemo(() => {
    if (!selected?.patch) return null;
    // DiffView expects a unified diff; API file patches are hunk-only.
    const header = [
      `diff --git a/${selected.filename} b/${selected.filename}`,
      `--- a/${selected.previousFilename ?? selected.filename}`,
      `+++ b/${selected.filename}`,
    ].join('\n');
    return `${header}\n${selected.patch}`;
  }, [selected]);

  if (pullNumber == null) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Select a pull request from the sidebar
      </div>
    );
  }

  if (loading && !detail) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Loading pull request…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted">
        <p>Could not load pull request #{pullNumber}</p>
        <button
          type="button"
          onClick={() => void dispatcher.refreshPullRequestDetail()}
          className="text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => dispatcher.closePullRequestDetail()}
                className="text-xs text-muted hover:text-foreground"
              >
                ← Back
              </button>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${
                  detail.draft
                    ? 'bg-muted/30 text-muted'
                    : detail.state === 'open'
                      ? 'bg-accent/20 text-accent'
                      : 'bg-danger/20 text-danger'
                }`}
              >
                {detail.draft ? 'draft' : detail.state}
              </span>
              <h2 className="truncate text-sm font-semibold">
                #{detail.number} {detail.title}
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted">
              {detail.user} wants to merge{' '}
              <span className="font-mono text-foreground">{detail.head.label}</span>{' '}
              into{' '}
              <span className="font-mono text-foreground">{detail.base.label}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={gitLoading}
              onClick={() => void dispatcher.checkoutPullRequestBranch()}
              className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-surface-elevated disabled:opacity-50"
            >
              Checkout branch
            </button>
            <button
              type="button"
              onClick={() => void dispatcher.refreshPullRequestDetail()}
              className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-surface-elevated"
            >
              Refresh
            </button>
            <a
              href={detail.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-surface-elevated"
            >
              Open on GitHub
            </a>
          </div>
        </div>
        {detail.labels.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {detail.labels.map((label) => (
              <span
                key={label.name}
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{
                  backgroundColor: `#${label.color}33`,
                  color: `#${label.color}`,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-h-0 min-w-0 flex-col border-r border-border">
          {detail.body ? (
            <div className="shrink-0 border-b border-border px-4 py-3">
              <h3 className="text-xs font-semibold text-muted">Description</h3>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-foreground">
                {detail.body}
              </pre>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1">
            <aside className="w-56 shrink-0 overflow-auto border-r border-border">
              <div className="sticky top-0 border-b border-border bg-surface px-3 py-2 text-xs font-semibold">
                Files ({files.length})
              </div>
              <ul className="p-1">
                {files.map((file) => (
                  <li key={file.filename}>
                    <button
                      type="button"
                      onClick={() =>
                        useAppStore.getState().setPullSelectedFile(file.filename)
                      }
                      className={`flex w-full flex-col rounded px-2 py-1.5 text-left text-[11px] ${
                        selectedFile === file.filename
                          ? 'bg-primary/15 text-primary'
                          : 'hover:bg-surface-elevated'
                      }`}
                    >
                      <span className="truncate font-mono">{file.filename}</span>
                      <span className="text-muted">
                        {file.status} · +{file.additions} −{file.deletions}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
            <div className="min-h-0 min-w-0 flex-1 overflow-auto p-2">
              {!selected ? (
                <p className="p-4 text-sm text-muted">Select a file</p>
              ) : !selected.patch ? (
                <div className="p-4 text-sm text-muted">
                  <p className="font-mono text-foreground">{selected.filename}</p>
                  <p className="mt-2">
                    No text patch available (binary or too large). Open on GitHub
                    to review this file.
                  </p>
                </div>
              ) : (
                <DiffView
                  data={{ hunks: [patchForView ?? selected.patch] }}
                  diffViewMode={DiffModeEnum.Split}
                  diffViewHighlight
                  diffViewTheme={resolvedTheme}
                />
              )}
            </div>
          </div>
        </div>

        <aside className="flex min-h-0 flex-col overflow-auto">
          <section className="border-b border-border p-3">
            <h3 className="text-xs font-semibold">Checks</h3>
            {checks.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted">No workflow runs found</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {checks.map((run) => (
                  <li key={run.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeRepoPath) {
                          void dispatcher.watchCiRun(activeRepoPath, run.id);
                        }
                      }}
                      className="flex w-full items-start gap-2 rounded border border-border px-2 py-1.5 text-left text-[11px] hover:bg-surface-elevated"
                    >
                      <span className="shrink-0 font-mono">
                        {checkBadge(run.status, run.conclusion)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {run.workflow}
                        </span>
                        <span className="block truncate text-muted">
                          {run.title || run.headBranch}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-b border-border p-3">
            <h3 className="text-xs font-semibold">Reviews</h3>
            {reviews.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted">No reviews yet</p>
            ) : (
              <ul className="mt-2 max-h-48 space-y-2 overflow-auto">
                {reviews.map((review) => (
                  <li
                    key={review.id}
                    className="rounded border border-border px-2 py-1.5 text-[11px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{review.user}</span>
                      <span className="text-muted">
                        {reviewStateLabel(review.state)}
                      </span>
                    </div>
                    {review.body ? (
                      <p className="mt-1 whitespace-pre-wrap text-muted">
                        {review.body}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-1 flex-col p-3">
            <h3 className="text-xs font-semibold">Submit review</h3>
            <textarea
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              rows={4}
              placeholder="Leave a comment (required for Comment / Request changes)"
              className="mt-2 w-full flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={gitLoading}
                onClick={() => {
                  void dispatcher
                    .submitPullRequestReview({
                      event: 'COMMENT',
                      body: reviewBody.trim(),
                    })
                    .then(() => setReviewBody(''));
                }}
                className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-surface-elevated disabled:opacity-50"
              >
                Comment
              </button>
              <button
                type="button"
                disabled={gitLoading}
                onClick={() => {
                  void dispatcher
                    .submitPullRequestReview({
                      event: 'APPROVE',
                      body: reviewBody.trim() || undefined,
                    })
                    .then(() => setReviewBody(''));
                }}
                className="rounded-md bg-accent/20 px-2 py-1 text-[11px] text-accent hover:bg-accent/30 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={gitLoading}
                onClick={() => {
                  void dispatcher
                    .submitPullRequestReview({
                      event: 'REQUEST_CHANGES',
                      body: reviewBody.trim(),
                    })
                    .then(() => setReviewBody(''));
                }}
                className="rounded-md bg-danger/20 px-2 py-1 text-[11px] text-danger hover:bg-danger/30 disabled:opacity-50"
              >
                Request changes
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
