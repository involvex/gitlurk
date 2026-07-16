import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { platform } from 'node:os';

export type GitProgressCallback = (message: string, percent?: number) => void;

export interface GitExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface GitStatusResult {
  staged: string[];
  unstaged: string[];
  untracked: string[];
  branch: string;
}

let cachedGitPath: string | null = null;

function getBundledGitPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'resources', 'git', 'cmd', 'git.exe'),
    path.join(process.cwd(), 'resources', 'git', 'bin', 'git.exe'),
    path.join(
      process.env.LOCALAPPDATA ?? '',
      'GitLurk',
      'git',
      'cmd',
      'git.exe',
    ),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function resolveGitExecutable(): Promise<string> {
  if (cachedGitPath) {
    return cachedGitPath;
  }

  const systemGit = await findSystemGit();
  if (systemGit) {
    cachedGitPath = systemGit;
    return systemGit;
  }

  const bundled = getBundledGitPath();
  if (bundled) {
    cachedGitPath = bundled;
    return bundled;
  }

  throw new Error(
    'Git not found. Install Git for Windows or bundle Portable Git in resources/git/',
  );
}

async function findSystemGit(): Promise<string | null> {
  const command = platform() === 'win32' ? 'where' : 'which';

  return new Promise((resolve) => {
    const proc = spawn(command, ['git'], { shell: true });
    let stdout = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }

      const firstLine = stdout.split(/\r?\n/).find((line) => line.trim());
      resolve(firstLine?.trim() ?? null);
    });

    proc.on('error', () => resolve(null));
  });
}

export function resetGitCache(): void {
  cachedGitPath = null;
}

export async function gitExec(
  args: string[],
  cwd: string,
  onProgress?: GitProgressCallback,
): Promise<GitExecResult> {
  const gitPath = await resolveGitExecutable();

  return new Promise((resolve, reject) => {
    const proc: ChildProcessWithoutNullStreams = spawn(gitPath, args, {
      cwd,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
      },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      onProgress?.(text.trim());
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      onProgress?.(text.trim());
    });

    proc.on('error', reject);

    proc.on('close', (exitCode) => {
      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 1,
      });
    });
  });
}

export async function isGitRepository(dir: string): Promise<boolean> {
  const result = await gitExec(['rev-parse', '--is-inside-work-tree'], dir);
  return result.exitCode === 0 && result.stdout.trim() === 'true';
}

export async function getStatus(dir: string): Promise<GitStatusResult> {
  const branchResult = await gitExec(['branch', '--show-current'], dir);
  const statusResult = await gitExec(['status', '--porcelain'], dir);

  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];

  for (const line of statusResult.stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const index = line[0] ?? ' ';
    const workTree = line[1] ?? ' ';
    const file = line.slice(3).trim();

    if (index === '?' && workTree === '?') {
      untracked.push(file);
      continue;
    }

    if (index !== ' ' && index !== '?') {
      staged.push(file);
    }

    if (workTree !== ' ' && workTree !== '?') {
      unstaged.push(file);
    }
  }

  return {
    staged,
    unstaged,
    untracked,
    branch: branchResult.stdout.trim() || 'HEAD',
  };
}

export async function cloneRepository(
  url: string,
  targetDir: string,
  onProgress?: GitProgressCallback,
): Promise<string> {
  const parent = path.dirname(targetDir);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }

  const result = await gitExec(
    ['clone', '--progress', url, targetDir],
    parent,
    onProgress,
  );

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || 'Clone failed');
  }

  return targetDir;
}

export async function commitChanges(
  dir: string,
  message: string,
  files?: string[],
): Promise<string> {
  if (files && files.length > 0) {
    const addResult = await gitExec(['add', '--', ...files], dir);
    if (addResult.exitCode !== 0) {
      throw new Error(addResult.stderr || 'Failed to stage files');
    }
  } else {
    const addResult = await gitExec(['add', '-A'], dir);
    if (addResult.exitCode !== 0) {
      throw new Error(addResult.stderr || 'Failed to stage files');
    }
  }

  const commitResult = await gitExec(['commit', '-m', message], dir);
  if (commitResult.exitCode !== 0) {
    throw new Error(commitResult.stderr || 'Commit failed');
  }

  const hashResult = await gitExec(['rev-parse', 'HEAD'], dir);
  return hashResult.stdout.trim();
}

export async function pull(dir: string): Promise<string> {
  const result = await gitExec(['pull'], dir);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || 'Pull failed');
  }
  return result.stdout.trim() || 'Pull completed';
}

export async function push(dir: string): Promise<string> {
  const result = await gitExec(['push'], dir);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || 'Push failed');
  }
  return result.stdout.trim() || 'Push completed';
}

export async function listBranches(
  dir: string,
): Promise<{ branches: string[]; current: string }> {
  const result = await gitExec(['branch', '--format=%(refname:short)'], dir);
  const currentResult = await gitExec(['branch', '--show-current'], dir);

  const branches = result.stdout
    .split(/\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return {
    branches,
    current: currentResult.stdout.trim(),
  };
}

export async function createBranch(dir: string, name: string): Promise<string> {
  const result = await gitExec(['branch', name], dir);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || 'Failed to create branch');
  }
  return name;
}

export async function checkoutBranch(
  dir: string,
  name: string,
): Promise<string> {
  const result = await gitExec(['checkout', name], dir);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || 'Failed to checkout branch');
  }
  return name;
}

export async function getRemoteOriginUrl(dir: string): Promise<string | null> {
  const result = await gitExec(['remote', 'get-url', 'origin'], dir);
  if (result.exitCode !== 0) {
    return null;
  }
  return result.stdout.trim();
}
