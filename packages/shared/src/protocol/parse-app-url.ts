export type UrlAction =
  | { type: 'openRepo'; url: string; branch?: string }
  | { type: 'openLocalRepo'; path: string; branch?: string }
  | { type: 'oauth'; code: string; state: string }
  | { type: 'clone'; url: string }
  | { type: 'unknown'; raw: string };

const ALLOWED_HOSTS = new Set(['github.com', 'www.github.com']);

export function parseAppUrl(raw: string): UrlAction {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'mygit:') {
      return { type: 'unknown', raw };
    }

    if (u.host === 'oauth') {
      return {
        type: 'oauth',
        code: u.searchParams.get('code') ?? '',
        state: u.searchParams.get('state') ?? '',
      };
    }

    if (u.host === 'openRepo') {
      const repoPath = decodeURIComponent(u.pathname.replace(/^\//, ''));
      const branch = u.searchParams.get('branch') ?? undefined;
      const parsedRepoUrl = repoPath.split('?')[0] ?? repoPath;

      try {
        const host = new URL(parsedRepoUrl).hostname;
        if (!ALLOWED_HOSTS.has(host)) {
          return { type: 'unknown', raw };
        }
      } catch {
        return { type: 'unknown', raw };
      }

      return { type: 'openRepo', url: parsedRepoUrl, branch };
    }

    if (u.host === 'openLocalRepo') {
      const path = decodeURIComponent(u.pathname.replace(/^\//, ''));
      const branch = u.searchParams.get('branch') ?? undefined;
      return { type: 'openLocalRepo', path, branch };
    }

    if (u.host === 'cloneRepo') {
      const url = decodeURIComponent(u.pathname.replace(/^\//, ''));
      try {
        const host = new URL(url).hostname;
        if (!ALLOWED_HOSTS.has(host)) {
          return { type: 'unknown', raw };
        }
      } catch {
        return { type: 'unknown', raw };
      }
      return { type: 'clone', url };
    }

    return { type: 'unknown', raw };
  } catch {
    return { type: 'unknown', raw };
  }
}

export function buildOpenRepoUrl(repoUrl: string, branch?: string): string {
  const base = `mygit://openRepo/${repoUrl}`;
  return branch ? `${base}?branch=${encodeURIComponent(branch)}` : base;
}

export function parseGitHubRemoteUrl(
  remoteUrl: string,
): { owner: string; repo: string } | null {
  const patterns = [
    /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/,
    /^([\w.-]+)\/([\w.-]+)$/,
  ];

  for (const pattern of patterns) {
    const match = remoteUrl.match(pattern);
    if (match) {
      return {
        owner: match[1] ?? '',
        repo: (match[2] ?? '').replace(/\.git$/, ''),
      };
    }
  }

  return null;
}
