import { useEffect, useState } from 'react';
import { ipcInvoke } from '../ipc/client';
import type { Repository } from '../stores/repos';
import { BranchStatus } from './BranchStatus';
import { CiRunsList } from './CiRunsList';
import { CommitList, type DashboardCommit } from './CommitList';

type BodyTab = 'commits' | 'ci' | 'branch';

export function RepoCardBody({ repo }: { repo: Repository }) {
  const [tab, setTab] = useState<BodyTab>('commits');
  const [aheadCommits, setAheadCommits] = useState<DashboardCommit[]>([]);
  const [behindCommits, setBehindCommits] = useState<DashboardCommit[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (repo.aheadCount === null && repo.behindCount === null) {
        setAheadCommits([]);
        setBehindCommits([]);
        return;
      }
      setLoadingCommits(true);
      try {
        const [ahead, behind] = await Promise.all([
          ipcInvoke('git:log', {
            path: repo.path,
            limit: 10,
            range: '@{u}..HEAD',
          }).catch(() => ({ entries: [] })),
          ipcInvoke('git:log', {
            path: repo.path,
            limit: 10,
            range: 'HEAD..@{u}',
          }).catch(() => ({ entries: [] })),
        ]);
        if (cancelled) return;
        setAheadCommits(
          ahead.entries.map((e) => ({
            sha: e.sha,
            subject: e.subject,
            author: e.author,
            date: e.date,
          })),
        );
        setBehindCommits(
          behind.entries.map((e) => ({
            sha: e.sha,
            subject: e.subject,
            author: e.author,
            date: e.date,
          })),
        );
      } finally {
        if (!cancelled) setLoadingCommits(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [repo.path, repo.aheadCount, repo.behindCount, repo.lastFetchedAt]);

  return (
    <div className="border-t border-border px-3 pb-3">
      <div className="mb-2 flex gap-1 pt-2">
        {(
          [
            ['commits', 'Commits'],
            ['ci', 'CI'],
            ['branch', 'Branch'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded px-2 py-1 text-xs ${
              tab === id
                ? 'bg-primary/20 text-primary'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'commits' ? (
        loadingCommits ? (
          <p className="text-xs text-muted">Loading commits…</p>
        ) : (
          <div className="space-y-3">
            <CommitList
              title="Ahead (local not pushed)"
              commits={aheadCommits}
              emptyLabel="No unpushed commits"
            />
            <CommitList
              title="Behind (remote not pulled)"
              commits={behindCommits}
              emptyLabel="No incoming commits"
            />
          </div>
        )
      ) : null}
      {tab === 'ci' ? <CiRunsList runs={repo.ciRuns} /> : null}
      {tab === 'branch' ? <BranchStatus repo={repo} /> : null}
    </div>
  );
}
