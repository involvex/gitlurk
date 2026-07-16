import type { GitLurkPluginApi } from '@gitlurk/plugin-sdk';

const api: GitLurkPluginApi = {
  git: {
    async status(repoPath) {
      void repoPath;
      return {
        branch: 'main',
        staged: [],
        unstaged: [],
        untracked: [],
      };
    },
  },
  ui: {
    toast(message) {
      console.log(`[toast] ${message}`);
    },
  },
  commands: {
    register(id, handler) {
      if (id === 'hello.say') {
        void handler({ repoPath: process.cwd() });
      }
    },
  },
};

export default function activate(pluginApi: GitLurkPluginApi) {
  pluginApi.commands.register('hello.say', async (ctx) => {
    const status = await pluginApi.git.status(ctx.repoPath);
    pluginApi.ui.toast(`Branch: ${status.branch}`);
  });
}

// CLI entry for plugin host
if (import.meta.main) {
  activate(api);
  console.log(JSON.stringify({ ok: true, plugin: 'example.hello' }));
}
