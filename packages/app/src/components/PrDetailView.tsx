import { useMemo, useState } from 'react';
import { DiffView, DiffModeEnum, SplitSide } from '@git-diff-view/react';
import '@git-diff-view/react/styles/diff-view.css';
import { dispatcher } from '../dispatcher';
import {
  getPullMergeGate,
  mergeMethodLabel,
  type MergeMethod,
} from '../lib/pr-actions';
import { extractPatchLine, insertSuggestion } from '../lib/pr-suggestion';
import { useAppStore } from '../stores';
import type { PullRequestReviewComment } from '../stores/git-ops';
import { ConfirmDialog } from './ConfirmDialog';

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

function sideLabel(side: 'LEFT' | 'RIGHT' | null): string {
  if (side === 'LEFT') return 'old';
  if (side === 'RIGHT') return 'new';
  return '';
}

type CommentExtend = {
  comments: PullRequestReviewComment[];
};

function LineCommentComposer({
  path,
  line,
  side,
  lineText,
  onClose,
}: {
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  /** Current file line text from the PR patch; seeds a suggestion fence. */
  lineText: string | null;
  onClose: () => void;
}) {
  const [body, setBody] = useState('');
  const gitLoading = useAppStore((s) => s.loading);
  const canSuggest = lineText != null;

  return (
    <div className="m-1 rounded-md border border-border bg-surface p-2 shadow-sm">
      <p className="mb-1 text-[10px] text-muted">
        Comment on {sideLabel(side)} line {line}
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        autoFocus
        placeholder="Leave a line comment…"
        className="w-full rounded-md border border-border bg-surface-elevated px-2 py-1.5 text-xs text-foreground"
      />
      <div className="mt-1.5 flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-surface-elevated"
        >
          Cancel
        </button>
        {canSuggest ? (
          <button
            type="button"
            disabled={gitLoading}
            title="Insert a GitHub suggested-change fence seeded with this line"
            onClick={() => {
              if (lineText == null) return;
              setBody((prev) => insertSuggestion(prev, lineText));
            }}
            className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-surface-elevated disabled:opacity-50"
          >
            Suggest change
          </button>
        ) : null}
        <button
          type="button"
          disabled={gitLoading || !body.trim()}
          onClick={() => {
            void dispatcher
              .submitPullRequestReview({
                event: 'COMMENT',
                body: body.trim(),
                comments: [
                  {
                    path,
                    body: body.trim(),
                    line,
                    side,
                    subjectType: 'line',
                  },
                ],
              })
              .then(() => {
                setBody('');
                onClose();
              });
          }}
          className="rounded-md bg-primary/20 px-2 py-1 text-[11px] text-primary hover:bg-primary/30 disabled:opacity-50"
        >
          Comment
        </button>
      </div>
    </div>
  );
}

function ExistingLineComments({ data }: { data: CommentExtend }) {
  return (
    <div className="mx-1 mb-1 space-y-1.5 border-l-2 border-primary/40 pl-2">
      {data.comments.map((comment) => (
        <div
          key={comment.id}
          className="rounded border border-border bg-surface px-2 py-1.5 text-[11px]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{comment.user}</span>
            <a
              href={comment.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="text-muted hover:text-primary"
            >
              GitHub
            </a>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-foreground">
            {comment.body}
          </p>
        </div>
      ))}
    </div>
  );
}

export function PrDetailView() {
  const loading = useAppStore((s) => s.pullDetailLoading);
  const detail = useAppStore((s) => s.pullDetail);
  const files = useAppStore((s) => s.pullFiles);
  const reviews = useAppStore((s) => s.pullReviews);
  const reviewComments = useAppStore((s) => s.pullReviewComments);
  const checks = useAppStore((s) => s.pullChecks);
  const selectedFile = useAppStore((s) => s.pullSelectedFile);
  const activeRepoPath = useAppStore((s) => s.activeRepoPath);
  const gitLoading = useAppStore((s) => s.loading);
  const resolvedTheme = useAppStore((s) => s.resolvedTheme);
  const pullNumber = useAppStore((s) => s.activePullNumber);

  const [reviewBody, setReviewBody] = useState('');
  const [widget, setWidget] = useState<{
    lineNumber: number;
    side: SplitSide;
  } | null>(null);
  const [mergeMethod, setMergeMethod] = useState<MergeMethod>('merge');
  const [confirmAction, setConfirmAction] = useState<
    'merge' | 'close' | 'reopen' | 'ready' | null
  >(null);

  const selected = useMemo(
    () => files.find((f) => f.filename === selectedFile) ?? null,
    [files, selectedFile],
  );

  const checksRunning = useMemo(
    () =>
      checks.some(
        (run) => run.status === 'in_progress' || run.status === 'queued',
      ),
    [checks],
  );

  const mergeGate = useMemo(
    () =>
      detail
        ? getPullMergeGate({
            state: detail.state,
            draft: detail.draft,
            mergeable: detail.mergeable,
            checksRunning,
          })
        : null,
    [detail, checksRunning],
  );

  const fileComments = useMemo(
    () =>
      selected
        ? reviewComments.filter((c) => c.path === selected.filename)
        : [],
    [reviewComments, selected],
  );

  const extendData = useMemo(() => {
    const oldFile: Record<string, { data: CommentExtend }> = {};
    const newFile: Record<string, { data: CommentExtend }> = {};
    for (const comment of fileComments) {
      const line = comment.line ?? comment.originalLine;
      if (line == null) continue;
      const key = String(line);
      const side = comment.side ?? 'RIGHT';
      const bucket = side === 'LEFT' ? oldFile : newFile;
      const existing = bucket[key];
      if (existing) {
        existing.data.comments.push(comment);
      } else {
        bucket[key] = { data: { comments: [comment] } };
      }
    }
    return { oldFile, newFile };
  }, [fileComments]);

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
              <span className="font-mono text-foreground">
                {detail.head.label}
              </span>{' '}
              into{' '}
              <span className="font-mono text-foreground">
                {detail.base.label}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mergeGate ? (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] ${
                  mergeGate.canMerge
                    ? 'bg-accent/20 text-accent'
                    : 'bg-muted/30 text-muted'
                }`}
                title={mergeGate.reason ?? undefined}
              >
                {mergeGate.label}
              </span>
            ) : null}
            {detail.state === 'open' && !detail.draft ? (
              <>
                <select
                  value={mergeMethod}
                  onChange={(e) =>
                    setMergeMethod(e.target.value as MergeMethod)
                  }
                  disabled={gitLoading || !mergeGate?.canMerge}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-xs disabled:opacity-50"
                  aria-label="Merge method"
                >
                  <option value="merge">Merge commit</option>
                  <option value="squash">Squash</option>
                  <option value="rebase">Rebase</option>
                </select>
                <button
                  type="button"
                  disabled={gitLoading || !mergeGate?.canMerge}
                  onClick={() => setConfirmAction('merge')}
                  className="rounded-md bg-accent/20 px-2.5 py-1 text-xs text-accent hover:bg-accent/30 disabled:opacity-50"
                  title={mergeGate?.reason ?? undefined}
                >
                  Merge
                </button>
              </>
            ) : null}
            {detail.state === 'open' && detail.draft ? (
              <button
                type="button"
                disabled={gitLoading}
                onClick={() => setConfirmAction('ready')}
                className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-surface-elevated disabled:opacity-50"
              >
                Ready for review
              </button>
            ) : null}
            {detail.state === 'open' ? (
              <button
                type="button"
                disabled={gitLoading}
                onClick={() => setConfirmAction('close')}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-danger hover:bg-danger/10 disabled:opacity-50"
              >
                Close
              </button>
            ) : (
              <button
                type="button"
                disabled={gitLoading}
                onClick={() => setConfirmAction('reopen')}
                className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-surface-elevated disabled:opacity-50"
              >
                Reopen
              </button>
            )}
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
                {files.map((file) => {
                  const count = reviewComments.filter(
                    (c) => c.path === file.filename,
                  ).length;
                  return (
                    <li key={file.filename}>
                      <button
                        type="button"
                        onClick={() => {
                          useAppStore
                            .getState()
                            .setPullSelectedFile(file.filename);
                          setWidget(null);
                        }}
                        className={`flex w-full flex-col rounded px-2 py-1.5 text-left text-[11px] ${
                          selectedFile === file.filename
                            ? 'bg-primary/15 text-primary'
                            : 'hover:bg-surface-elevated'
                        }`}
                      >
                        <span className="truncate font-mono">
                          {file.filename}
                        </span>
                        <span className="text-muted">
                          {file.status} · +{file.additions} −{file.deletions}
                          {count > 0
                            ? ` · ${count} comment${count === 1 ? '' : 's'}`
                            : ''}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
            <div className="min-h-0 min-w-0 flex-1 overflow-auto p-2">
              {!selected ? (
                <p className="p-4 text-sm text-muted">Select a file</p>
              ) : !selected.patch ? (
                <div className="p-4 text-sm text-muted">
                  <p className="font-mono text-foreground">
                    {selected.filename}
                  </p>
                  <p className="mt-2">
                    No text patch available (binary or too large). Open on
                    GitHub to review this file.
                  </p>
                  {fileComments.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {fileComments.map((comment) => (
                        <li
                          key={comment.id}
                          className="rounded border border-border px-2 py-1.5 text-[11px] text-foreground"
                        >
                          <span className="font-medium">{comment.user}</span>
                          {comment.line != null ? (
                            <span className="text-muted">
                              {' '}
                              · line {comment.line}
                            </span>
                          ) : null}
                          <p className="mt-1 whitespace-pre-wrap">
                            {comment.body}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <DiffView<CommentExtend>
                  data={{ hunks: [patchForView ?? selected.patch] }}
                  diffViewMode={DiffModeEnum.Split}
                  diffViewHighlight
                  diffViewTheme={resolvedTheme}
                  diffViewAddWidget
                  extendData={extendData}
                  renderExtendLine={({ data }) => (
                    <ExistingLineComments data={data} />
                  )}
                  onAddWidgetClick={(lineNumber, side) => {
                    setWidget({ lineNumber, side });
                  }}
                  renderWidgetLine={({ lineNumber, side, onClose }) => {
                    if (
                      !widget ||
                      widget.lineNumber !== lineNumber ||
                      widget.side !== side ||
                      !selected
                    ) {
                      return null;
                    }
                    const commentSide =
                      side === SplitSide.old ? 'LEFT' : 'RIGHT';
                    const lineText = selected.patch
                      ? extractPatchLine(
                          selected.patch,
                          lineNumber,
                          commentSide,
                        )
                      : null;
                    return (
                      <LineCommentComposer
                        path={selected.filename}
                        line={lineNumber}
                        side={commentSide}
                        lineText={lineText}
                        onClose={() => {
                          setWidget(null);
                          onClose();
                        }}
                      />
                    );
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <aside className="flex min-h-0 flex-col overflow-auto">
          <section className="border-b border-border p-3">
            <h3 className="text-xs font-semibold">Checks</h3>
            {checks.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted">
                No workflow runs found
              </p>
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
            <h3 className="text-xs font-semibold">
              Line comments ({fileComments.length}
              {selected ? ` in file` : ''})
            </h3>
            {!selected ? (
              <p className="mt-2 text-[11px] text-muted">Select a file</p>
            ) : fileComments.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted">
                No line comments on this file. Click + on a diff line to add
                one.
              </p>
            ) : (
              <ul className="mt-2 max-h-48 space-y-2 overflow-auto">
                {fileComments.map((comment) => (
                  <li
                    key={comment.id}
                    className="rounded border border-border px-2 py-1.5 text-[11px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{comment.user}</span>
                      <span className="text-muted">
                        {comment.line != null
                          ? `L${comment.line}${sideLabel(comment.side) ? ` (${sideLabel(comment.side)})` : ''}`
                          : 'file'}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-muted">
                      {comment.body}
                    </p>
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

      {confirmAction === 'merge' ? (
        <ConfirmDialog
          title={`Merge #${detail.number}?`}
          message={`${mergeMethodLabel(mergeMethod)} into ${detail.base.ref}. This cannot be undone from GitLurk.`}
          confirmLabel="Merge"
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            setConfirmAction(null);
            void dispatcher.mergePullRequest({ mergeMethod });
          }}
        />
      ) : null}
      {confirmAction === 'close' ? (
        <ConfirmDialog
          title={`Close #${detail.number}?`}
          message="The pull request will be closed without merging."
          confirmLabel="Close PR"
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            setConfirmAction(null);
            void dispatcher.updatePullRequest({ state: 'closed' });
          }}
        />
      ) : null}
      {confirmAction === 'reopen' ? (
        <ConfirmDialog
          title={`Reopen #${detail.number}?`}
          message="The pull request will be marked open again."
          confirmLabel="Reopen"
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            setConfirmAction(null);
            void dispatcher.updatePullRequest({ state: 'open' });
          }}
        />
      ) : null}
      {confirmAction === 'ready' ? (
        <ConfirmDialog
          title={`Mark #${detail.number} ready for review?`}
          message="The draft flag will be cleared so reviewers can approve and merge."
          confirmLabel="Ready for review"
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            setConfirmAction(null);
            void dispatcher.updatePullRequest({ draft: false });
          }}
        />
      ) : null}
    </div>
  );
}
