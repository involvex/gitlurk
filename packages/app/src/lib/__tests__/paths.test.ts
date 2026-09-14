import { describe, expect, test } from 'bun:test';
import { joinRepoPath, parentDir } from '../paths';

describe('joinRepoPath', () => {
  test('joins repo root with relative path', () => {
    expect(joinRepoPath('D:\\repos\\app', 'src/main.ts')).toBe(
      'D:\\repos\\app\\src\\main.ts',
    );
  });

  test('handles trailing separators on root', () => {
    expect(joinRepoPath('D:\\repos\\app\\', 'README.md')).toBe(
      'D:\\repos\\app\\README.md',
    );
  });

  test('returns root when relative is empty', () => {
    expect(joinRepoPath('D:\\repos\\app', '')).toBe('D:\\repos\\app');
  });
});

describe('parentDir', () => {
  test('returns parent of file path', () => {
    expect(parentDir('D:\\repos\\app\\src\\main.ts')).toBe(
      'D:\\repos\\app\\src',
    );
  });
});
