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
  'auth:github-device-start': {
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
  };
  'auth:github-device-poll': {
    token?: string;
    error?: string;
    pending?: boolean;
  };
  'auth:get-token': { token: string | null; username: string | null };
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
};

export type IpcChannel = keyof IpcChannels;
export type IpcEvent = keyof IpcEvents;
