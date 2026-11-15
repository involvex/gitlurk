import type { Repository } from '../stores/repos';

export function BranchStatus({ repo }: { repo: Repository }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      <dt className="text-muted">Branch</dt>
      <dd className="font-mono text-foreground">{repo.currentBranch || '—'}</dd>
      <dt className="text-muted">Upstream</dt>
      <dd className="font-mono text-foreground">
        {repo.upstreamBranch || 'none'}
      </dd>
      <dt className="text-muted">Working tree</dt>
      <dd className={repo.dirty ? 'text-danger' : 'text-muted'}>
        {repo.dirty ? 'dirty' : 'clean'}
      </dd>
      <dt className="text-muted">Sync</dt>
      <dd className="text-foreground">
        {repo.aheadCount === null && repo.behindCount === null
          ? 'no tracking branch'
          : `↑${repo.aheadCount ?? 0} ↓${repo.behindCount ?? 0}`}
      </dd>
    </dl>
  );
}
