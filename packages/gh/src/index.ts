import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { platform } from 'node:os';

export interface GhExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface GhExecOptions {
  cwd?: string;
  inheritStdio?: boolean;
}

let cachedGhPath: string | null = null;

const GH_INSTALL_HINT =
  'GitHub CLI (gh) not found. Install from https://cli.github.com';

async function findGhOnPath(): Promise<string | null> {
  const command = platform() === 'win32' ? 'where' : 'which';

  return new Promise((resolve) => {
    const proc = spawn(command, ['gh'], { shell: true });
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

export async function resolveGhExecutable(): Promise<string> {
  if (cachedGhPath) return cachedGhPath;
  const found = await findGhOnPath();
  if (!found) throw new Error(GH_INSTALL_HINT);
  cachedGhPath = found;
  return found;
}

export function resetGhCache(): void {
  cachedGhPath = null;
}

export async function ghExec(
  args: string[],
  options: GhExecOptions = {},
): Promise<GhExecResult> {
  const ghPath = await resolveGhExecutable();
  const cwd = options.cwd ?? process.cwd();

  if (options.inheritStdio) {
    const exitCode = await ghPassthrough(args, cwd);
    return { stdout: '', stderr: '', exitCode };
  }

  return new Promise((resolve, reject) => {
    const proc: ChildProcessWithoutNullStreams = spawn(ghPath, args, {
      cwd,
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
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

export async function ghPassthrough(
  args: string[],
  cwd: string = process.cwd(),
): Promise<number> {
  const ghPath = await resolveGhExecutable();

  return new Promise((resolve, reject) => {
    const proc = spawn(ghPath, args, {
      cwd,
      stdio: 'inherit',
      shell: false,
    });

    proc.on('error', reject);
    proc.on('close', (code) => resolve(code ?? 1));
  });
}

export async function ghVersion(): Promise<string | null> {
  try {
    const result = await ghExec(['--version']);
    if (result.exitCode !== 0) return null;
    return result.stdout.trim().split('\n')[0] ?? null;
  } catch {
    return null;
  }
}

export async function listRuns(
  extraArgs: string[] = [],
  cwd?: string,
): Promise<number> {
  return ghPassthrough(['run', 'list', ...extraArgs], cwd);
}

export async function watchRun(
  extraArgs: string[] = [],
  cwd?: string,
): Promise<number> {
  return ghPassthrough(['run', 'watch', ...extraArgs], cwd);
}

export async function forkRepo(
  extraArgs: string[] = [],
  cwd?: string,
): Promise<number> {
  return ghPassthrough(['repo', 'fork', ...extraArgs], cwd);
}

export async function editRepo(
  extraArgs: string[] = [],
  cwd?: string,
): Promise<number> {
  return ghPassthrough(['repo', 'edit', ...extraArgs], cwd);
}

export async function createRelease(
  extraArgs: string[] = [],
  cwd?: string,
): Promise<number> {
  return ghPassthrough(['release', 'create', ...extraArgs], cwd);
}

export async function ghAlias(
  extraArgs: string[] = [],
  cwd?: string,
): Promise<number> {
  return ghPassthrough(['alias', ...extraArgs], cwd);
}

export async function ghConfig(
  extraArgs: string[] = [],
  cwd?: string,
): Promise<number> {
  return ghPassthrough(['config', ...extraArgs], cwd);
}

export async function ghSkill(
  extraArgs: string[] = [],
  cwd?: string,
): Promise<number> {
  return ghPassthrough(['skill', ...extraArgs], cwd);
}

export async function ghAuthStatus(cwd?: string): Promise<GhExecResult> {
  return ghExec(['auth', 'status'], { cwd });
}

export async function listGhConfig(cwd?: string): Promise<GhExecResult> {
  return ghExec(['config', 'list'], { cwd });
}

export async function getGhConfig(
  key: string,
  cwd?: string,
): Promise<GhExecResult> {
  return ghExec(['config', 'get', key], { cwd });
}

export async function setGhConfig(
  key: string,
  value: string,
  cwd?: string,
): Promise<GhExecResult> {
  return ghExec(['config', 'set', key, value], { cwd });
}

export async function listGhAliases(cwd?: string): Promise<GhExecResult> {
  return ghExec(['alias', 'list'], { cwd });
}
