import {
  createRelease,
  editRepo,
  forkRepo,
  ghAlias,
  ghConfig,
  ghPassthrough,
  ghSkill,
  listRuns,
  resolveGhExecutable,
  watchRun,
} from '@gitlurk/gh';

async function requireGh(): Promise<void> {
  try {
    await resolveGhExecutable();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

export async function runGhCommand(args: string[]): Promise<void> {
  await requireGh();
  const command = args[0];

  if (command === 'runs') {
    process.exit(await listRuns(args.slice(1)));
  }

  if (command === 'watch') {
    process.exit(await watchRun(args.slice(1)));
  }

  if (command === 'fork') {
    process.exit(await forkRepo(args.slice(1)));
  }

  if (command === 'repo' && args[1] === 'edit') {
    process.exit(await editRepo(args.slice(2)));
  }

  if (command === 'release' && args[1] === 'create') {
    process.exit(await createRelease(args.slice(2)));
  }

  if (command === 'alias') {
    process.exit(await ghAlias(args.slice(1)));
  }

  if (command === 'config') {
    process.exit(await ghConfig(args.slice(1)));
  }

  if (command === 'skill') {
    process.exit(await ghSkill(args.slice(1)));
  }
}

export async function runGhPassthrough(args: string[]): Promise<void> {
  await requireGh();
  process.exit(await ghPassthrough(args));
}

export function isGhCommand(command: string | undefined): boolean {
  if (!command) return false;
  return (
    command === 'gh' ||
    command === 'runs' ||
    command === 'watch' ||
    command === 'fork' ||
    command === 'repo' ||
    command === 'release' ||
    command === 'alias' ||
    command === 'config' ||
    command === 'skill'
  );
}
