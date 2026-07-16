export interface PluginContext {
  repoPath: string;
}

export interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface GitLurkPluginApi {
  git: {
    status(repoPath: string): Promise<GitStatus>;
  };
  ui: {
    toast(message: string): void;
  };
  commands: {
    register(
      id: string,
      handler: (ctx: PluginContext) => void | Promise<void>,
    ): void;
  };
}

export type PluginActivate = (api: GitLurkPluginApi) => void;
