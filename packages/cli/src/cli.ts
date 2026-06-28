#!/usr/bin/env bun
import { buildOpenRepoUrl } from '@mygit/shared';

const args = process.argv.slice(2);
const command = args[0];

function spawnDesktop(arg: string) {
  const exe =
    process.env.MYGIT_DESKTOP_EXE ??
    'C:\\Program Files\\MyGit Desktop\\mygit-desktop.exe';
  Bun.spawn([exe, arg], { stdout: 'inherit', stderr: 'inherit' });
}

if (command === 'open' && args[1]) {
  spawnDesktop(`--open-local=${args[1]}`);
} else if (command === 'clone' && args[1]) {
  spawnDesktop(`--clone=${args[1]}`);
} else if (command === 'url' && args[1]) {
  spawnDesktop(buildOpenRepoUrl(args[1], args[2]));
} else {
  console.log(`MyGit CLI

Usage:
  mygit open <path>           Open local repository
  mygit clone <url>           Clone repository
  mygit url <repo-url> [branch]  Open via protocol handler
`);
  process.exit(1);
}
