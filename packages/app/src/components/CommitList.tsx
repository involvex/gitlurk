export interface DashboardCommit {
  sha: string;
  subject: string;
  author: string;
  date: string;
}

export function CommitList({
  title,
  commits,
  emptyLabel,
}: {
  title: string;
  commits: DashboardCommit[];
  emptyLabel: string;
}) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold text-muted">{title}</h4>
      {commits.length === 0 ? (
        <p className="text-xs text-muted">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1">
          {commits.map((c) => (
            <li
              key={c.sha}
              className="rounded border border-border px-2 py-1 text-xs"
            >
              <span className="font-mono text-primary">
                {c.sha.slice(0, 7)}
              </span>{' '}
              <span className="text-foreground">{c.subject}</span>
              <span className="mt-0.5 block text-muted">
                {c.author} · {c.date}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
