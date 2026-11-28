import { describe, expect, test } from 'bun:test';
import {
  extractPatchLine,
  insertSuggestion,
  wrapSuggestion,
} from '../pr-suggestion';

const SAMPLE = [
  '@@ -10,4 +10,5 @@ function demo() {',
  '   const a = 1;',
  '-  const b = 2;',
  '+  const b = 3;',
  '+  const c = 4;',
  '   return a + b;',
  ' }',
].join('\n');

describe('wrapSuggestion', () => {
  test('wraps a single line', () => {
    expect(wrapSuggestion('const x = 1;')).toBe(
      '```suggestion\nconst x = 1;\n```',
    );
  });

  test('strips a trailing newline from the seed', () => {
    expect(wrapSuggestion('foo\n')).toBe('```suggestion\nfoo\n```');
  });
});

describe('insertSuggestion', () => {
  test('uses seed when body is empty', () => {
    expect(insertSuggestion('', 'line')).toBe('```suggestion\nline\n```');
  });

  test('appends after existing prose', () => {
    expect(insertSuggestion('Please fix', 'line')).toBe(
      'Please fix\n\n```suggestion\nline\n```',
    );
  });

  test('does not double-wrap an existing suggestion', () => {
    const body = '```suggestion\nalready\n```';
    expect(insertSuggestion(body, 'other')).toBe(body);
  });
});

describe('extractPatchLine', () => {
  test('reads context on both sides', () => {
    expect(extractPatchLine(SAMPLE, 10, 'LEFT')).toBe('  const a = 1;');
    expect(extractPatchLine(SAMPLE, 10, 'RIGHT')).toBe('  const a = 1;');
  });

  test('reads deleted line on LEFT only', () => {
    expect(extractPatchLine(SAMPLE, 11, 'LEFT')).toBe('  const b = 2;');
    expect(extractPatchLine(SAMPLE, 11, 'RIGHT')).toBe('  const b = 3;');
  });

  test('reads added lines on RIGHT', () => {
    expect(extractPatchLine(SAMPLE, 12, 'RIGHT')).toBe('  const c = 4;');
    expect(extractPatchLine(SAMPLE, 13, 'RIGHT')).toBe('  return a + b;');
  });

  test('returns null for missing lines', () => {
    expect(extractPatchLine(SAMPLE, 99, 'RIGHT')).toBeNull();
    expect(extractPatchLine('', 1, 'RIGHT')).toBeNull();
  });

  test('ignores diff --git headers before hunks', () => {
    const full = [
      'diff --git a/f.ts b/f.ts',
      '--- a/f.ts',
      '+++ b/f.ts',
      SAMPLE,
    ].join('\n');
    expect(extractPatchLine(full, 11, 'RIGHT')).toBe('  const b = 3;');
  });
});
