import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findMonorepoRoot } from './repo-root.js';

export function readGitlurkVersion(): string {
  const root = findMonorepoRoot();
  if (!root) return '0.0.0';
  const pkgPath = join(root, 'package.json');
  if (!existsSync(pkgPath)) return '0.0.0';
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}
