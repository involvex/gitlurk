#!/usr/bin/env bun
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOpenRepoUrl } from '@gitlurk/shared';

const rawArgs = process.argv.slice(2);
// Support `gitlurk -- .` / `gitlurk -- open .`
const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
const command = args[0];
const EXE_NAME = 'gitlurk-desktop.exe';

function findMonorepoRoot(): string | null {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 12; i++) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
          workspaces?: unknown;
        };
        const appPkg = join(dir, 'packages/app/package.json');
        if (pkg.workspaces && existsSync(appPkg)) {
          return dir;
        }
      } catch {
        // continue walking
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

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

function spawnDesktop(arg: string) {
  const repoRoot = findMonorepoRoot();
  const exe = resolveDesktopExe(repoRoot);

  if (exe) {
    console.log(`Launching ${exe}`);
    console.log(`  arg: ${arg}`);
    const child = Bun.spawn([exe, arg], {
      stdout: 'ignore',
      stderr: 'ignore',
      stdin: 'ignore',
      windowsHide: false,
    });
    child.unref();
    return;
  }

  if (!repoRoot) {
    console.error(
      'GitLurk Desktop executable not found and monorepo root could not be resolved.\n' +
        'Set GITLURK_DESKTOP_EXE or CARGO_TARGET_DIR, or run `bun link` from the GitLurk checkout.',
    );
    process.exit(1);
  }

  console.log(
    `No ${EXE_NAME} found — launching via bun tauri from ${repoRoot}`,
  );
  console.log(`  arg: ${arg}`);
  const child = Bun.spawn(
    [
      'bun',
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
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'ignore',
    },
  );
  child.unref();
}

function openLocalPath(pathArg: string) {
  const abs = resolve(pathArg);
  spawnDesktop(`--open-local=${abs}`);
}

function printUsage() {
  console.log(`GitLurk CLI

Usage:
  gitlurk                       Open current directory in GitLurk Desktop
  gitlurk .                     Same as above (resolved absolute path)
  gitlurk open <path>           Open local repository
  gitlurk clone <url>           Clone repository
  gitlurk url <repo-url> [branch]  Open via protocol handler

Env:
  GITLURK_DESKTOP_EXE           Path to gitlurk-desktop.exe (optional)
  CARGO_TARGET_DIR              Cargo target dir; uses release/ then debug/

Install:
  bun link                       (from repo root) — uses the root package.json "bin" field

If no exe is found, falls back to:
  bun run --filter @gitlurk/app tauri dev --release --no-watch -- <arg>
`);
}

if (!command || command === '.') {
  openLocalPath(command === '.' ? '.' : process.cwd());
} else if (command === 'open' && args[1]) {
  openLocalPath(args[1]);
} else if (command === 'clone' && args[1]) {
  spawnDesktop(`--clone=${args[1]}`);
} else if (command === 'url' && args[1]) {
  spawnDesktop(buildOpenRepoUrl(args[1], args[2]));
} else if (command === 'help' || command === '-h' || command === '--help') {
  printUsage();
} else {
  printUsage();
  process.exit(1);
}
