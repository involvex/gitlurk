import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildOpenRepoUrl } from '@gitlurk/shared';
import { findMonorepoRoot } from '../lib/repo-root.js';

const EXE_NAME = 'gitlurk-desktop.exe';

function parseCargoTargetDir(repoRoot: string): string | null {
  const configPath = join(repoRoot, '.cargo/config.toml');
  if (!existsSync(configPath)) return null;
  try {
    const text = readFileSync(configPath, 'utf8');
    const match = text.match(/^\s*target-dir\s*=\s*"([^"]+)"/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function exeUnderTargetDir(targetDir: string): string[] {
  const abs = resolve(targetDir);
  return [join(abs, 'release', EXE_NAME), join(abs, 'debug', EXE_NAME)];
}

function candidateExePaths(repoRoot: string | null): string[] {
  const candidates: string[] = [];
  const envExe =
    process.env.GITLURK_DESKTOP_EXE ?? process.env.MYGIT_DESKTOP_EXE;
  if (envExe) candidates.push(envExe);

  const cargoTarget = process.env.CARGO_TARGET_DIR;
  if (cargoTarget) {
    candidates.push(...exeUnderTargetDir(cargoTarget));
  }

  if (repoRoot) {
    const fromConfig = parseCargoTargetDir(repoRoot);
    if (fromConfig) {
      candidates.push(...exeUnderTargetDir(fromConfig));
    }
    candidates.push(
      join(repoRoot, 'packages/app/src-tauri/target/release', EXE_NAME),
      join(repoRoot, 'packages/app/src-tauri/target/debug', EXE_NAME),
    );
  }

  return candidates;
}

function resolveDesktopExe(repoRoot: string | null): string | null {
  for (const path of candidateExePaths(repoRoot)) {
    if (path && existsSync(path)) return path;
  }
  return null;
}

export function spawnDesktop(arg: string): void {
  const repoRoot = findMonorepoRoot();
  const exe = resolveDesktopExe(repoRoot);

  if (exe) {
    console.log(`Launching ${exe}`);
    console.log(`  arg: ${arg}`);
    const child = spawn(exe, [arg], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();
    return;
  }

  if (!repoRoot) {
    console.error(
      'GitLurk Desktop executable not found and monorepo root could not be resolved.\n' +
        'Set GITLURK_DESKTOP_EXE or CARGO_TARGET_DIR, or install with `gitlurk install-desktop`.',
    );
    process.exit(1);
  }

  console.log(
    `No ${EXE_NAME} found — launching via bun tauri from ${repoRoot}`,
  );
  console.log(`  arg: ${arg}`);
  const child = spawn(
    'bun',
    [
      'run',
      '--filter',
      '@gitlurk/app',
      'tauri',
      'dev',
      '--release',
      '--no-watch',
      '--',
      arg,
    ],
    {
      cwd: repoRoot,
      detached: true,
      stdio: 'ignore',
    },
  );
  child.unref();
}

export function openLocalPath(pathArg: string): void {
  const abs = resolve(pathArg);
  spawnDesktop(`--open-local=${abs}`);
}

export function runDesktopCommand(args: string[]): boolean {
  const command = args[0];

  if (!command || command === '.') {
    openLocalPath(command === '.' ? '.' : process.cwd());
    return true;
  }

  if (command === 'open' && args[1]) {
    openLocalPath(args[1]);
    return true;
  }

  if (command === 'clone' && args[1]) {
    spawnDesktop(`--clone=${args[1]}`);
    return true;
  }

  if (command === 'url' && args[1]) {
    spawnDesktop(buildOpenRepoUrl(args[1], args[2]));
    return true;
  }

  return false;
}
