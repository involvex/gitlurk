import { useCallback, useEffect, useState } from 'react';
import { ipcInvoke } from '../ipc/client';
import { useAppStore } from '../stores';

type DiscoverTab = 'notifications' | 'feed' | 'explore' | 'trending';

type Notification = {
  id: string;
  title: string;
  reason: string;
  unread: boolean;
  updatedAt: string;
  repo: string;
  url: string;
};

type FeedEvent = {
  id: string;
  type: string;
  actor: string;
  repo: string;
  createdAt: string;
  summary: string;
  url: string;
};

type RepoCard = {
  fullName: string;
  url: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
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
          Notifications, activity feed, explore, and trending
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ['notifications', 'Notifications'],
              ['feed', 'Feed'],
              ['explore', 'Explore'],
              ['trending', 'Trending'],
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
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-sm font-medium">
                      {n.unread ? '● ' : ''}
                      {n.title}
                    </p>
                    <p className="text-xs text-muted">
                      {n.repo} · {n.reason} ·{' '}
                      {new Date(n.updatedAt).toLocaleString()}
                    </p>
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
                    className="w-full rounded-md border border-border px-3 py-2 text-left hover:bg-surface-elevated"
                  >
                    <p className="text-sm">
                      <span className="font-medium">@{e.actor}</span>{' '}
                      {e.summary} <span className="text-muted">{e.repo}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {e.type} · {new Date(e.createdAt).toLocaleString()}
                    </p>
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
            ) : (
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
            )}
            <ul className="space-y-2">
              {repos.length === 0 ? (
                <p className="text-sm text-muted">No repositories found</p>
              ) : (
                repos.map((r) => (
                  <li key={r.fullName}>
                    <button
                      type="button"
                      onClick={() => openUrl(r.url)}
                      className="w-full rounded-md border border-border px-3 py-2 text-left hover:bg-surface-elevated"
                    >
                      <p className="text-sm font-medium">{r.fullName}</p>
                      <p className="text-xs text-muted line-clamp-2">
                        {r.description || 'No description'}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        ★ {r.stars} · forks {r.forks}
                        {r.language ? ` · ${r.language}` : ''}
                      </p>
                    </button>
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
