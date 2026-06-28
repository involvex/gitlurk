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
  'app:get-repos': Record<string, never>;
  'app:save-repos': { repos: string[] };
  'app:get-theme': Record<string, never>;
  'app:set-theme': { theme: 'light' | 'dark' | 'system' };
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
  'app:get-repos': { repos: string[] };
  'app:save-repos': void;
  'app:get-theme': { theme: 'light' | 'dark' | 'system' };
  'app:set-theme': void;
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
}

export type IpcEvents = {
  'url-action': UrlAction;
  'git:progress': { op: string; percent: number; message: string };
  'tray-action': 'pull' | 'show';
  'cli-action': UrlAction;
  'terminal-output': { sessionId: string; data: string };
};

export type IpcChannel = keyof IpcChannels;
export type IpcEvent = keyof IpcEvents;
