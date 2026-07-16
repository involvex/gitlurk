#!/usr/bin/env node
import { ghVersion } from '@gitlurk/gh';
import { runDesktopCommand } from './commands/desktop.js';
import { isGhCommand, runGhCommand, runGhPassthrough } from './commands/gh.js';
import {
  isGitConfigCommand,
  runGitConfigCommand,
} from './commands/git-config.js';
import { runInstallDesktop } from './commands/install-desktop.js';
import { printUsage } from './lib/print-usage.js';
import { readGitlurkVersion } from './lib/version.js';

function stripGlobalFlags(argv: string[]): {
  args: string[];
  help: boolean;
  version: boolean;
} {
  const args: string[] = [];
  let help = false;
  let version = false;

  for (const arg of argv) {
    if (arg === '-h' || arg === '--help') help = true;
    else if (arg === '-V' || arg === '--version') version = true;
    else args.push(arg);
  }

  return { args, help, version };
}

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const normalized = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
  const { args, help, version } = stripGlobalFlags(normalized);

  if (version) {
    console.log(`gitlurk ${readGitlurkVersion()}`);
    const gh = await ghVersion();
    if (gh) console.log(gh);
    return;
  }

  if (help || args[0] === 'help') {
    printUsage();
    return;
  }

  if (args[0] === 'install-desktop') {
    try {
      await runInstallDesktop();
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    return;
  }

  if (isGitConfigCommand(args)) {
    await runGitConfigCommand(args);
    return;
  }

  if (args[0] === 'gh') {
    await runGhPassthrough(args.slice(1));
    return;
  }

  if (isGhCommand(args[0])) {
    await runGhCommand(args);
    return;
  }

  if (runDesktopCommand(args)) {
    return;
  }

  printUsage();
  process.exit(1);
}

void main();
