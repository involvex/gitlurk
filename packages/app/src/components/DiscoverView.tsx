import { useCallback, useEffect, useState } from 'react';
import { ipcInvoke } from '../ipc/client';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';

type DiscoverTab =
  'notifications' | 'feed' | 'explore' | 'trending' | 'my-repos';

type Notification = {
  id: string;
  title: string;
  reason: string;
  unread: boolean;
  updatedAt: string;
  repo: string;
  url: string;
  subjectType: string;
  avatarUrl: string;
};

type FeedEvent = {
  id: string;
  type: string;
  actor: string;
  repo: string;
  createdAt: string;
  summary: string;
  url: string;
  avatarUrl: string;
};

type RepoCard = {
  fullName: string;
  url: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  avatarUrl: string;
  cloneUrl: string;
  private: boolean;
  updatedAt: string;
};

const EXPLORE_PRESETS = [
  'stars:>1000',
  'topic:typescript',
  'topic:rust',
  'good-first-issues:>5',
];

const TRENDING_LANGS = [
  'all',
  'TypeScript',
  'JavaScript',
  'Rust',
  'Python',
  'Go',
];

function initialsFrom(name: string): string {
  const parts = name
    .replace(/^@/, '')
    .split(/[/\s_-]+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function Avatar({
  src,
  label,
  size = 28,
}: {
  src: string;
  label: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface-elevated text-[10px] font-medium text-muted"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {initialsFrom(label)}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function SubjectTypeIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t === 'pullrequest') {
    return (
      <svg
        className="h-3.5 w-3.5 text-primary"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden
      >
        <path d="M7.177 3.073 9.573.677A.25.25 0 0 1 10 .854v4.792a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25ZM11 2.5h-1V4h1a1 1 0 0 1 1 1v5.628a2.251 2.251 0 1 0 1.5 0V5A2.5 2.5 0 0 0 11 2.5Zm1 10.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM3.75 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
      </svg>
    );
  }
  if (t === 'release') {
    return (
      <svg
        className="h-3.5 w-3.5 text-accent"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden
      >
        <path d="M1 7.775V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.238.513l6.25 6.25a1.75 1.75 0 0 1 0 2.474l-5.026 5.026a1.75 1.75 0 0 1-2.474 0l-6.25-6.25A1.752 1.752 0 0 1 1 7.775Zm1.5 0c0 .066.026.13.073.177l6.25 6.25a.25.25 0 0 0 .354 0l5.025-5.025a.25.25 0 0 0 0-.354l-6.25-6.25a.25.25 0 0 0-.177-.073H2.75a.25.25 0 0 0-.25.25ZM6 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
      </svg>
    );
  }
  if (t === 'issue') {
    return (
      <svg
        className="h-3.5 w-3.5 text-accent"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden
      >
        <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
      </svg>
    );
  }
  return (
    <svg
      className="h-3.5 w-3.5 text-muted"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm.25-14.75v5.5a.75.75 0 0 1-1.5 0v-5.5a.75.75 0 0 1 1.5 0ZM8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </svg>
  );
}

export function DiscoverView() {
  const username = useAppStore((s) => s.username);
  const discoverTab = useAppStore((s) => s.discoverTab);
  const [tab, setTab] = useState<DiscoverTab>(discoverTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [repos, setRepos] = useState<RepoCard[]>([]);
  const [query, setQuery] = useState('stars:>1000');
  const [language, setLanguage] = useState('all');

  useEffect(() => {
    setTab(discoverTab);
  }, [discoverTab]);

  const selectTab = (next: DiscoverTab) => {
    setTab(next);
    useAppStore.getState().setDiscoverTab(next);
  };

  const loadTab = useCallback(
    async (next: DiscoverTab) => {
      if (!username) {
        setError('Sign in to GitHub to use Discover.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (next === 'notifications') {
          const result = await ipcInvoke('github:list-notifications', {
            all: true,
          });
          setNotifications(result.notifications);
          useAppStore.getState().setUnreadNotifications(result.unreadCount);
        } else if (next === 'feed') {
          const result = await ipcInvoke('github:list-feed', {});
          setEvents(result.events);
        } else if (next === 'explore') {
          const result = await ipcInvoke('github:search-repos', { query });
          setRepos(result.repos);
        } else if (next === 'my-repos') {
          const result = await ipcInvoke('github:list-my-repos', {});
          setRepos(result.repos);
        } else {
          const result = await ipcInvoke('github:trending', {
            language: language === 'all' ? undefined : language,
          });
          setRepos(result.repos);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load Discover',
        );
      } finally {
        setLoading(false);
      }
    },
    [username, query, language],
  );

  useEffect(() => {
    void loadTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- explore search is manual; trending refreshes on language below
  }, [tab, username]);

  useEffect(() => {
    if (tab === 'trending' && username) {
      void loadTab('trending');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const openUrl = (url: string) => {
    void ipcInvoke('shell:open-external', { url });
  };

  const cloneRepo = async (repo: RepoCard) => {
    const cloneUrl = repo.cloneUrl || `https://github.com/${repo.fullName}.git`;
    const dir = await ipcInvoke('dialog:save-directory', {
      title: 'Clone Repository',
      defaultPath: repo.fullName.split('/').pop(),
    });
    if (dir) {
      await dispatcher.cloneRepo(cloneUrl, dir);
    }
  };

  const markRead = async (id: string) => {
    try {
      await ipcInvoke('github:mark-notification-read', { id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
      );
      const unread = notifications.filter(
        (n) => n.id !== id && n.unread,
      ).length;
      useAppStore.getState().setUnreadNotifications(unread);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mark read failed');
    }
  };

  if (!username) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        <div className="text-center">
          <p className="text-lg font-medium">Discover</p>
          <p className="mt-2 text-sm">
            Sign in to GitHub to see notifications, your feed, explore, and
            trending repos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold">Discover</h2>
        <p className="text-xs text-muted">
          Notifications, activity feed, explore, trending, and your repos
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ['notifications', 'Notifications'],
              ['feed', 'Feed'],
              ['explore', 'Explore'],
              ['trending', 'Trending'],
              ['my-repos', 'My repos'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              className={`rounded-md px-3 py-1.5 text-xs ${
                tab === id
                  ? 'bg-primary/20 text-primary'
                  : 'border border-border hover:bg-surface-elevated'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <div className="mx-6 mt-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {tab === 'notifications' ? (
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-xs text-muted">GitHub notifications</p>
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadTab('notifications')}
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-elevated disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : tab === 'notifications' ? (
          <ul className="space-y-2">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted">No notifications</p>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => openUrl(n.url)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <Avatar src={n.avatarUrl} label={n.repo} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <SubjectTypeIcon type={n.subjectType} />
                        <span className="text-sm font-medium">
                          {n.unread ? '● ' : ''}
                          {n.title}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {n.repo} · {n.reason} ·{' '}
                        {new Date(n.updatedAt).toLocaleString()}
                      </span>
                    </span>
                  </button>
                  {n.unread ? (
                    <button
                      type="button"
                      onClick={() => void markRead(n.id)}
                      className="shrink-0 text-xs text-primary hover:underline"
                    >
                      Mark read
                    </button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        ) : tab === 'feed' ? (
          <ul className="space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-muted">No recent activity</p>
            ) : (
              events.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => openUrl(e.url)}
                    className="flex w-full items-start gap-3 rounded-md border border-border px-3 py-2 text-left hover:bg-surface-elevated"
                  >
                    <Avatar src={e.avatarUrl} label={e.actor} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">
                        <span className="font-medium">@{e.actor}</span>{' '}
                        {e.summary} <span className="text-muted">{e.repo}</span>
                      </span>
                      <span className="block text-xs text-muted">
                        {e.type} · {new Date(e.createdAt).toLocaleString()}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : (
          <div className="space-y-4">
            {tab === 'explore' ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void loadTab('explore');
                  }}
                  className="min-w-[220px] flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
                  placeholder="Search repositories"
                />
                <button
                  type="button"
                  onClick={() => void loadTab('explore')}
                  className="rounded-md bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover"
                >
                  Search
                </button>
                {EXPLORE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setQuery(preset);
                      void ipcInvoke('github:search-repos', {
                        query: preset,
                      }).then((r) => setRepos(r.repos));
                    }}
                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-elevated"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            ) : tab === 'trending' ? (
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted">Language</label>
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                  }}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
                >
                  {TRENDING_LANGS.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void loadTab('trending')}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-elevated"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted">Your repositories</p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadTab('my-repos')}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-elevated disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
            )}
            <ul className="space-y-2">
              {repos.length === 0 ? (
                <p className="text-sm text-muted">No repositories found</p>
              ) : (
                repos.map((r) => (
                  <li
                    key={r.fullName}
                    className="flex items-start gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <Avatar src={r.avatarUrl} label={r.fullName} />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => openUrl(r.url)}
                        className="text-left hover:underline"
                      >
                        <p className="text-sm font-medium">
                          {r.fullName}
                          {r.private ? (
                            <span className="ml-2 text-xs font-normal text-muted">
                              private
                            </span>
                          ) : null}
                        </p>
                      </button>
                      <p className="text-xs text-muted line-clamp-2">
                        {r.description || 'No description'}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        ★ {r.stars} · forks {r.forks}
                        {r.language ? ` · ${r.language}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => openUrl(r.url)}
                        className="text-xs text-primary hover:underline"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => void cloneRepo(r)}
                        className="text-xs text-primary hover:underline"
                      >
                        Clone
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
