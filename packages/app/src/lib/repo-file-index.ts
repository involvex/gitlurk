export type RepoDirEntry = {
  name: string;
  path: string;
  kind: 'file' | 'dir';
};

export const DEFAULT_SKIP_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'target',
  'coverage',
  '.turbo',
  '__pycache__',
  '.venv',
  'venv',
  '.cache',
]);

export type CollectRepoFilesOptions = {
  maxFiles?: number;
  maxDepth?: number;
  skipDirNames?: Set<string>;
};

/**
 * Breadth-first walk of `listDir` results. Returns repo-relative file paths
 * (forward-slash style as returned by fs:list-dir).
 */
export async function collectRepoFilePaths(
  listDir: (relativePath?: string) => Promise<RepoDirEntry[]>,
  options: CollectRepoFilesOptions = {},
): Promise<string[]> {
  const maxFiles = options.maxFiles ?? 2000;
  const maxDepth = options.maxDepth ?? 10;
  const skip = options.skipDirNames ?? DEFAULT_SKIP_DIR_NAMES;

  const files: string[] = [];
  const queue: Array<{ path?: string; depth: number }> = [
    { path: undefined, depth: 0 },
  ];

  while (queue.length > 0 && files.length < maxFiles) {
    const current = queue.shift();
    if (!current) break;
    if (current.depth > maxDepth) continue;

    let entries: RepoDirEntry[];
    try {
      entries = await listDir(current.path);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.kind === 'file') {
        files.push(entry.path);
        if (files.length >= maxFiles) break;
        continue;
      }
      if (entry.kind !== 'dir') continue;
      if (skip.has(entry.name)) continue;
      if (current.depth >= maxDepth) continue;
      queue.push({ path: entry.path, depth: current.depth + 1 });
    }
  }

  return files;
}

/** Score a repo-relative path against a palette query (0 = no match). */
export function scoreFilePath(query: string, filePath: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const path = filePath.toLowerCase().replace(/\\/g, '/');
  const name = path.split('/').pop() ?? path;
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  if (path.includes(q)) return 40;
  const tokens = q.split(/[\s/\\]+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => path.includes(t))) return 30;
  return 0;
}
