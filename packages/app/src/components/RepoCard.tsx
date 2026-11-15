import { useState } from 'react';
import type { Repository } from '../stores/repos';
import { dispatcher } from '../dispatcher';
import { RepoCardBody } from './RepoCardBody';
import { RepoCardHeader } from './RepoCardHeader';

export function RepoCard({ repo }: { repo: Repository }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-lg border border-border bg-surface-elevated">
      <RepoCardHeader
        repo={repo}
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        onRefresh={() => void dispatcher.refreshRepo(repo.path)}
        onOpen={() => void dispatcher.selectRepo(repo.path)}
      />
      {expanded ? <RepoCardBody repo={repo} /> : null}
    </article>
  );
}
