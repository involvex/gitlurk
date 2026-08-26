import { useEffect, useRef, useState } from 'react';
import { onEvent } from '../ipc/client';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';
import { formatStepDuration } from '../lib/duration';

type GhRunView = NonNullable<
  ReturnType<typeof useAppStore.getState>['ghRunView']
>;

function statusColor(status: string, conclusion: string | null): string {
  if (conclusion === 'success') return 'text-green-500';
  if (conclusion === 'failure' || conclusion === 'timed_out') {
    return 'text-red-500';
  }
  if (conclusion === 'skipped' || conclusion === 'cancelled') {
    return 'text-muted';
  }
  if (status === 'in_progress' || status === 'queued') {
    return 'text-amber-500';
  }
  return 'text-muted';
}

function statusGlyph(status: string, conclusion: string | null): string {
  if (conclusion === 'success') return '✓';
  if (conclusion === 'failure' || conclusion === 'timed_out') return '✕';
  if (conclusion === 'skipped') return '−';
  if (status === 'in_progress' || status === 'queued') return '●';
  return '?';
}

function RunBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] text-muted">
      {label}
    </span>
  );
}

function JobsPanel({ view }: { view: GhRunView }) {
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-auto">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="truncate text-xs font-medium">
          {view.displayTitle ?? view.workflow ?? `Run ${view.id ?? '?'}`}
        </span>
        {view.status ? <RunBadge label={view.status} /> : null}
        {view.conclusion ? <RunBadge label={view.conclusion} /> : null}
      </div>
      {view.jobs.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">
          No job details available yet.
        </p>
      ) : (
        view.jobs.map((job) => (
          <details
            key={`${job.name}-${job.startedAt ?? ''}`}
            className="rounded-md border border-border"
            open
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-1.5">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`font-mono text-[11px] ${statusColor(job.status, job.conclusion)}`}
                >
                  {statusGlyph(job.status, job.conclusion)}
                </span>
                <span className="truncate text-xs font-medium">{job.name}</span>
              </span>
              <span className="shrink-0 text-[10px] text-muted">
                {formatStepDuration(job.startedAt, job.completedAt) ??
                  job.status}
              </span>
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {job.steps.map((step) => (
                <li
                  key={`${step.number}-${step.name}`}
                  className="flex items-center justify-between gap-2 px-3 py-1"
                >
                  <span className="flex min-w-0 items-center gap-2 pl-4">
                    <span
                      className={`text-[11px] ${statusColor(step.status, step.conclusion)}`}
                    >
                      {statusGlyph(step.status, step.conclusion)}
                    </span>
                    <span className="truncate text-[11px]">{step.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted">
                    {formatStepDuration(step.startedAt, step.completedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))
      )}
    </div>
  );
}

export function GhRunWatchDialog() {
  const show = useAppStore((s) => s.showGhRunWatch);
  const log = useAppStore((s) => s.ghRunWatchLog);
  const running = useAppStore((s) => s.ghRunWatchRunning);
  const path = useAppStore((s) => s.ghRunWatchPath);
  const ghRunView = useAppStore((s) => s.ghRunView);
  const ghRunViewLoading = useAppStore((s) => s.ghRunViewLoading);
  const [tab, setTab] = useState<'jobs' | 'log'>('jobs');
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!show) return;

    let unlistenOutput: (() => void) | undefined;
    let unlistenDone: (() => void) | undefined;

    void (async () => {
      unlistenOutput = await onEvent('dev:gh-run-output', (payload) => {
        useAppStore.getState().appendGhRunWatchLog(payload.data);
      });
      unlistenDone = await onEvent('dev:gh-run-done', (payload) => {
        useAppStore.getState().setGhRunWatchRunning(false);
        useAppStore
          .getState()
          .appendGhRunWatchLog(`\n[done] exit code ${payload.exitCode}\n`);
        void dispatcher.loadCiRunView(path);
      });
    })();

    return () => {
      unlistenOutput?.();
      unlistenDone?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  useEffect(() => {
    if (preRef.current && tab === 'log') {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [log, tab]);

  useEffect(() => {
    if (!show) setTab('jobs');
  }, [show]);

  if (!show) return null;

  const canRerunFailed =
    ghRunView?.id != null &&
    (ghRunView.conclusion === 'failure' ||
      ghRunView.jobs.some((job) => job.conclusion === 'failure'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-surface p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">CI run</h2>
            {path ? (
              <p className="truncate text-[11px] text-muted" title={path}>
                {path}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {canRerunFailed ? (
              <button
                type="button"
                onClick={() => void dispatcher.rerunCiRunFailed(path)}
                className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-elevated"
                title="Re-run failed jobs"
              >
                Re-run failed
              </button>
            ) : null}
            <button
              type="button"
              disabled={ghRunViewLoading}
              onClick={() => void dispatcher.loadCiRunView(path)}
              className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-elevated disabled:opacity-50"
            >
              {ghRunViewLoading ? '…' : 'Refresh'}
            </button>
            {running ? (
              <button
                type="button"
                onClick={() => void dispatcher.stopWatchCiRun()}
                className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-elevated"
              >
                Stop
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void dispatcher.closeWatchCiRun()}
              className="text-xs text-muted hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mb-2 flex rounded-md border border-border p-0.5">
          {(['jobs', 'log'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-3 py-1 text-xs ${
                tab === t
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {t === 'jobs' ? 'Jobs' : 'Live log'}
            </button>
          ))}
        </div>

        {tab === 'jobs' ? (
          ghRunViewLoading && !ghRunView ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">
              Loading run details…
            </div>
          ) : ghRunView ? (
            <JobsPanel view={ghRunView} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">
              No run details available.
            </div>
          )
        ) : (
          <pre
            ref={preRef}
            className="min-h-[240px] flex-1 overflow-auto rounded bg-surface-elevated p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
          >
            {log || (running ? 'Starting gh run watch…\n' : 'No output yet.\n')}
          </pre>
        )}
        <p className="mt-2 text-[10px] text-muted">
          {tab === 'log'
            ? running
              ? 'Streaming from gh…'
              : 'Watch finished'
            : 'Structured view via gh run view --json jobs'}
        </p>
      </div>
    </div>
  );
}
