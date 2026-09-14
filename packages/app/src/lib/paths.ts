/** Join a repo root with a repo-relative path using the host separator. */
export function joinRepoPath(repoRoot: string, relativePath: string): string {
  const root = repoRoot.replace(/[/\\]+$/, '');
  const rel = relativePath.replace(/^[/\\]+/, '').replace(/\//g, '\\');
  if (!rel) return root;
  return `${root}\\${rel}`;
}

/** Parent directory of an absolute path (Windows-oriented). */
export function parentDir(absolutePath: string): string {
  const normalized = absolutePath.replace(/[/\\]+$/, '');
  const cut = Math.max(
    normalized.lastIndexOf('\\'),
    normalized.lastIndexOf('/'),
  );
  if (cut <= 0) return normalized;
  return normalized.slice(0, cut);
}
