import { describe, expect, test } from 'bun:test';
import {
  collectRepoFilePaths,
  scoreFilePath,
  type RepoDirEntry,
} from '../repo-file-index';

function fakeListDir(
  tree: Record<string, RepoDirEntry[]>,
): (relativePath?: string) => Promise<RepoDirEntry[]> {
  return async (relativePath) => {
    const key = relativePath ?? '';
    return tree[key] ?? [];
  };
}

describe('collectRepoFilePaths', () => {
  test('walks nested dirs and skips node_modules', async () => {
    const tree: Record<string, RepoDirEntry[]> = {
      '': [
        { name: 'README.md', path: 'README.md', kind: 'file' },
        { name: 'src', path: 'src', kind: 'dir' },
        { name: 'node_modules', path: 'node_modules', kind: 'dir' },
      ],
      src: [
        { name: 'app.ts', path: 'src/app.ts', kind: 'file' },
        { name: 'lib', path: 'src/lib', kind: 'dir' },
      ],
      'src/lib': [{ name: 'util.ts', path: 'src/lib/util.ts', kind: 'file' }],
      node_modules: [{ name: 'pkg', path: 'node_modules/pkg', kind: 'dir' }],
    };

    const files = await collectRepoFilePaths(fakeListDir(tree));
    expect(files).toEqual(['README.md', 'src/app.ts', 'src/lib/util.ts']);
  });

  test('respects maxFiles', async () => {
    const tree: Record<string, RepoDirEntry[]> = {
      '': [
        { name: 'a.ts', path: 'a.ts', kind: 'file' },
        { name: 'b.ts', path: 'b.ts', kind: 'file' },
        { name: 'c.ts', path: 'c.ts', kind: 'file' },
      ],
    };
    const files = await collectRepoFilePaths(fakeListDir(tree), {
      maxFiles: 2,
    });
    expect(files).toHaveLength(2);
  });
});

describe('scoreFilePath', () => {
  test('ranks basename matches above path matches', () => {
    expect(scoreFilePath('app', 'src/app.ts')).toBeGreaterThan(
      scoreFilePath('app', 'src/apple/index.ts'),
    );
    expect(scoreFilePath('util', 'src/lib/util.ts')).toBeGreaterThan(0);
    expect(scoreFilePath('', 'src/app.ts')).toBe(0);
  });
});
