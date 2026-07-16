import {
  gitConfigEdit,
  gitConfigGet,
  gitConfigList,
  gitConfigSet,
  type GitConfigScope,
} from '@gitlurk/git';

function parseScope(args: string[]): {
  scope: GitConfigScope;
  remaining: string[];
} {
  let scope: GitConfigScope = 'local';
  const remaining: string[] = [];

  for (const arg of args) {
    if (arg === '--global') scope = 'global';
    else if (arg === '--local') scope = 'local';
    else if (arg === '--system') scope = 'system';
    else remaining.push(arg);
  }

  return { scope, remaining };
}

export async function runGitConfigCommand(args: string[]): Promise<boolean> {
  if (args[0] !== 'git' || args[1] !== 'config') return false;

  const sub = args[2];
  const { scope, remaining } = parseScope(args.slice(3));
  const cwd = process.cwd();

  if (sub === 'list') {
    const entries = await gitConfigList({ scope, cwd });
    for (const entry of entries) {
      if (entry.origin) {
        console.log(`${entry.origin}\t${entry.key}=${entry.value}`);
      } else {
        console.log(`${entry.key}=${entry.value}`);
      }
    }
    return true;
  }

  if (sub === 'get') {
    const key = remaining[0];
    if (!key) {
      console.error('Usage: gitlurk git config get <key> [--global|--local]');
      process.exit(1);
    }
    const value = await gitConfigGet({ key, scope, cwd });
    if (value === null) process.exit(1);
    console.log(value);
    return true;
  }

  if (sub === 'set') {
    const key = remaining[0];
    const value = remaining[1];
    if (!key || value === undefined) {
      console.error(
        'Usage: gitlurk git config set <key> <value> [--global|--local]',
      );
      process.exit(1);
    }
    await gitConfigSet({ key, value, scope, cwd });
    return true;
  }

  if (sub === 'edit') {
    await gitConfigEdit({ scope, cwd });
    return true;
  }

  console.error('Unknown git config subcommand. Use list, get, set, or edit.');
  process.exit(1);
}

export function isGitConfigCommand(args: string[]): boolean {
  return args[0] === 'git' && args[1] === 'config';
}
