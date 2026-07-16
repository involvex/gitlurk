import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findMonorepoRoot } from './repo-root.js';

function readVersionFrom(pkgPath: string): string | null {
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

export function readGitlurkVersion(): string {
  const root = findMonorepoRoot();
  if (root) {
    const fromRoot = readVersionFrom(join(root, 'package.json'));
    if (fromRoot) return fromRoot;
  }

  // Published package: dist/index.js → ../package.json
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [
    join(here, '..', 'package.json'),
    join(here, '..', '..', 'package.json'),
  ]) {
    const v = readVersionFrom(candidate);
    if (v) return v;
  }

  return '0.0.0';
}
