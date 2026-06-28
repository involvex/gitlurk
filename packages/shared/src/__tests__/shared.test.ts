import { describe, expect, test } from 'bun:test';
import { parseAppUrl, buildOpenRepoUrl } from '../protocol/parse-app-url.js';
import {
  validateRepoPath,
  PathValidationError,
} from '../security/path-validator.js';

describe('parseAppUrl', () => {
  test('parses openRepo for github.com', () => {
    const action = parseAppUrl(
      'mygit://openRepo/https://github.com/owner/repo',
    );
    expect(action).toEqual({
      type: 'openRepo',
      url: 'https://github.com/owner/repo',
      branch: undefined,
    });
  });

  test('rejects non-github hosts', () => {
    const action = parseAppUrl(
      'mygit://openRepo/https://gitlab.com/owner/repo',
    );
    expect(action.type).toBe('unknown');
  });

  test('buildOpenRepoUrl roundtrip', () => {
    const url = buildOpenRepoUrl('https://github.com/a/b', 'main');
    const action = parseAppUrl(url);
    expect(action.type).toBe('openRepo');
    if (action.type === 'openRepo') {
      expect(action.url).toBe('https://github.com/a/b');
      expect(action.branch).toBe('main');
    }
  });
});

describe('validateRepoPath', () => {
  test('accepts normal paths', () => {
    const result = validateRepoPath('C:\\Users\\dev\\projects\\repo');
    expect(result).toContain('repo');
  });

  test('rejects empty path', () => {
    expect(() => validateRepoPath('')).toThrow(PathValidationError);
  });
});
