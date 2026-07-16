import type { UrlAction } from '../protocol/parse-app-url.js';

export interface IpcChannels {
  'git:status': { path: string };
  'git:clone': { url: string; dir: string; depth?: number };
  'git:commit': { path: string; message: string; files?: string[] };
  'git:pull': { path: string };
  'git:push': { path: string };
  'git:branch-list': { path: string };
  'git:branch-create': { path: string; name: string };
  'git:branch-checkout': { path: string; name: string };
  'git:is-repo': { path: string };
  'git:get-remote-origin': { path: string };
  'dialog:open-directory': { title?: string };
  'dialog:save-directory': { title?: string; defaultPath?: string };
  'shell:open-external': { url: string };
  'shell:open-terminal': { path: string };
  'shell:reveal-in-explorer': { path: string };
  'app:get-repos': Record<string, never>;
  'app:save-repos': { repos: string[] };
  'app:take-pending-action': Record<string, never>;
  'app:get-theme': Record<string, never>;
  'app:set-theme': { theme: 'light' | 'dark' | 'system' };
  'app:get-settings': Record<string, never>;
  'app:set-settings': {
    theme?: 'light' | 'dark' | 'system';
    sidebarWidth?: number;
    fileListWidth?: number;
    rightRailWidth?: number;
    terminalHeight?: number;
    aiProvider?: 'opencode' | 'kilo';
    aiModel?: string;
    kiloBaseUrl?: string;
  };
  'app:get-explorer-menu': Record<string, never>;
  'app:set-explorer-menu': { enabled: boolean };
  'git:diff': {
    path: string;
    file: string;
    kind: 'staged' | 'unstaged' | 'untracked';
  };
  'terminal:spawn': { cwd: string; cols: number; rows: number };
  'terminal:write': { sessionId: string; data: string };
  'terminal:resize': { sessionId: string; cols: number; rows: number };
  'terminal:kill': { sessionId: string };
  'plugins:list-marketplace': Record<string, never>;
  'plugins:list-installed': Record<string, never>;
  'plugins:install': { id: string };
  'plugins:invoke': {
    id: string;
    method: string;
    params: Record<string, unknown>;
  };
  'auth:github-device-start': Record<string, never>;
  'auth:github-device-poll': { deviceCode: string };
  'auth:get-token': Record<string, never>;
  'auth:logout': Record<string, never>;
  'github:list-prs': { owner: string; repo: string };
  'github:list-notifications': { all?: boolean };
  'github:mark-notification-read': { id: string };
  'github:list-feed': Record<string, never>;
  'github:search-repos': { query: string };
  'github:trending': { language?: string };
  'ai:set-api-key': { provider: 'opencode' | 'kilo'; key: string };
  'ai:has-api-key': { provider: 'opencode' | 'kilo' };
  'ai:list-models': Record<string, never>;
  'ai:generate-commit-message': { path: string; style?: string };
  'ai:test-connection': Record<string, never>;
  'dev:gh-version': Record<string, never>;
  'dev:gh-auth-status': Record<string, never>;
  'dev:gh-run-list': { repo?: string; limit?: number; path?: string };
  'dev:gh-run-watch': { runId?: string; repo?: string; path?: string };
  'dev:gh-run-watch-stop': Record<string, never>;
  'dev:gh-repo-fork': { repo?: string; clone?: boolean; path?: string };
  'dev:gh-release-create': {
    tag: string;
    title?: string;
    notes?: string;
    draft?: boolean;
    path?: string;
  };
  'dev:gh-config-list': Record<string, never>;
  'dev:gh-config-get': { key: string };
  'dev:gh-config-set': { key: string; value: string };
  'dev:gh-alias-list': Record<string, never>;
  'dev:git-config-list': {
    scope?: 'global' | 'local' | 'system';
    path?: string;
  };
  'dev:git-config-get': {
    key: string;
    scope?: 'global' | 'local' | 'system';
    path?: string;
  };
  'dev:git-config-set': {
    key: string;
    value: string;
    scope?: 'global' | 'local' | 'system';
    path?: string;
  };
  'dev:git-config-edit': {
    scope?: 'global' | 'local' | 'system';
    path?: string;
  };
}

export interface IpcResponses {
  'git:status': {
    staged: string[];
    unstaged: string[];
    untracked: string[];
    branch: string;
  };
  'git:clone': { path: string };
  'git:commit': { hash: string };
  'git:pull': { summary: string };
  'git:push': { summary: string };
  'git:branch-list': { branches: string[]; current: string };
  'git:branch-create': { name: string };
  'git:branch-checkout': { name: string };
  'git:is-repo': { isRepo: boolean };
  'git:get-remote-origin': { url: string | null };
  'dialog:open-directory': string | null;
  'dialog:save-directory': string | null;
  'shell:open-external': void;
  'shell:open-terminal': void;
  'shell:reveal-in-explorer': void;
  'app:get-repos': { repos: string[] };
  'app:save-repos': void;
  'app:take-pending-action':
    import('../protocol/parse-app-url.js').UrlAction | null;
  'app:get-theme': { theme: 'light' | 'dark' | 'system' };
  'app:set-theme': void;
  'app:get-settings': {
    theme: 'light' | 'dark' | 'system';
    sidebarWidth: number;
    fileListWidth: number;
    rightRailWidth: number;
    terminalHeight: number;
    aiProvider: 'opencode' | 'kilo';
    aiModel: string;
    kiloBaseUrl: string;
  };
  'app:set-settings': void;
  'app:get-explorer-menu': { enabled: boolean };
  'app:set-explorer-menu': void;
  'git:diff': { patch: string; isBinary: boolean };
  'terminal:spawn': { sessionId: string };
  'terminal:write': void;
  'terminal:resize': void;
  'terminal:kill': void;
  'plugins:list-marketplace': {
    plugins: Array<{
      id: string;
      name: string;
      version: string;
      downloadUrl: string;
      sha256: string;
      permissions: string[];
    }>;
  };
  'plugins:list-installed': {
    plugins: Array<{ id: string; name: string; version: string }>;
  };
  'plugins:install': { id: string; path: string };
  'plugins:invoke': { result: string };
  'auth:github-device-start': {
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
  };
  'auth:github-device-poll': {
    success?: boolean;
    error?: string;
    pending?: boolean;
    slowDown?: boolean;
  };
  'auth:get-token': { username: string | null };
  'auth:logout': void;
  'github:list-prs': {
    pulls: Array<{
      number: number;
      title: string;
      url: string;
      state: string;
      user: string;
    }>;
  };
  'github:list-notifications': {
    notifications: Array<{
      id: string;
      title: string;
      reason: string;
      unread: boolean;
      updatedAt: string;
      repo: string;
      url: string;
    }>;
    unreadCount: number;
  };
  'github:mark-notification-read': void;
  'github:list-feed': {
    events: Array<{
      id: string;
      type: string;
      actor: string;
      repo: string;
      createdAt: string;
      summary: string;
      url: string;
    }>;
  };
  'github:search-repos': {
    repos: Array<{
      fullName: string;
      url: string;
      description: string;
      stars: number;
      forks: number;
      language: string;
    }>;
  };
  'github:trending': {
    repos: Array<{
      fullName: string;
      url: string;
      description: string;
      stars: number;
      forks: number;
      language: string;
    }>;
  };
  'ai:set-api-key': void;
  'ai:has-api-key': { hasKey: boolean };
  'ai:list-models': { models: string[]; provider: string };
  'ai:generate-commit-message': { message: string };
  'ai:test-connection': { ok: boolean; provider: string };
  'dev:gh-version': { installed: boolean; version: string | null };
  'dev:gh-auth-status': { loggedIn: boolean; summary: string };
  'dev:gh-run-list': {
    runs: Array<{
      id: string;
      status: string;
      workflow: string;
      createdAt: string;
      url: string;
    }>;
  };
  'dev:gh-run-watch': { started: boolean };
  'dev:gh-run-watch-stop': void;
  'dev:gh-repo-fork': { summary: string };
  'dev:gh-release-create': { url: string };
  'dev:gh-config-list': { entries: Array<{ key: string; value: string }> };
  'dev:gh-config-get': { value: string | null };
  'dev:gh-config-set': void;
  'dev:gh-alias-list': {
    aliases: Array<{ name: string; expansion: string }>;
  };
  'dev:git-config-list': {
    entries: Array<{ key: string; value: string; origin?: string }>;
  };
  'dev:git-config-get': { value: string | null };
  'dev:git-config-set': void;
  'dev:git-config-edit': void;
}

export type IpcEvents = {
  'url-action': UrlAction;
  'git:progress': { op: string; percent: number; message: string };
  'tray-action': 'pull' | 'show';
  'cli-action': UrlAction;
  'terminal-output': { sessionId: string; data: string };
  'dev:gh-run-output': { data: string };
  'dev:gh-run-done': { exitCode: number };
};

export type IpcChannel = keyof IpcChannels;
export type IpcEvent = keyof IpcEvents;
