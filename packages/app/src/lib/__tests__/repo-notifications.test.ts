import { describe, expect, test } from 'bun:test';

/** Mirrors dispatcher mutedGithubFullNames matching for unit coverage. */
function unmutedUnreadCount(
  notifications: Array<{ unread: boolean; repo: string }>,
  repos: Array<{
    notificationsEnabled: boolean;
    githubFullName: string | null;
  }>,
): number {
  const muted = new Set<string>();
  for (const repo of repos) {
    if (!repo.notificationsEnabled && repo.githubFullName) {
      muted.add(repo.githubFullName.toLowerCase());
    }
  }
  return notifications.filter(
    (n) => n.unread && !muted.has(n.repo.toLowerCase()),
  ).length;
}

describe('per-repo notification mute', () => {
  test('counts unread outside muted github full names', () => {
    const repos = [
      {
        notificationsEnabled: false,
        githubFullName: 'acme/noisy',
      },
      {
        notificationsEnabled: true,
        githubFullName: 'acme/quiet',
      },
    ];
    const notifications = [
      { unread: true, repo: 'acme/noisy' },
      { unread: true, repo: 'acme/quiet' },
      { unread: false, repo: 'acme/quiet' },
    ];
    expect(unmutedUnreadCount(notifications, repos)).toBe(1);
  });

  test('defaults to notifying when githubFullName unknown', () => {
    const repos = [{ notificationsEnabled: false, githubFullName: null }];
    const notifications = [{ unread: true, repo: 'acme/other' }];
    expect(unmutedUnreadCount(notifications, repos)).toBe(1);
  });
});
