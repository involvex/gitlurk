import { describe, expect, test } from 'bun:test';
import {
  parseAppUrl,
  buildOpenRepoUrl,
  parseGitHubRemoteUrl,
} from '../protocol/parse-app-url.js';
import {
  validateRepoPath,
  PathValidationError,
} from '../security/path-validator.js';

describe('parseAppUrl', () => {
  test('parses openRepo for github.com', () => {
    const action = parseAppUrl(
      'gitlurk://openRepo/https://github.com/owner/repo',
    );
    expect(action).toEqual({
      type: 'openRepo',
      url: 'https://github.com/owner/repo',
      branch: undefined,
    });
  });

  test('rejects non-github hosts', () => {
    const action = parseAppUrl(
      'gitlurk://openRepo/https://gitlab.com/owner/repo',
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

describe('parseGitHubRemoteUrl', () => {
  test('parses https url with .git suffix', () => {
    expect(parseGitHubRemoteUrl('https://github.com/owner/repo.git')).toEqual({
      owner: 'owner',
      repo: 'repo',
    });
  });

  test('parses https url without .git suffix', () => {
    expect(parseGitHubRemoteUrl('https://github.com/owner/repo')).toEqual({
      owner: 'owner',
      repo: 'repo',
    });
  });

  test('parses ssh url', () => {
    expect(parseGitHubRemoteUrl('git@github.com:owner/repo.git')).toEqual({
      owner: 'owner',
      repo: 'repo',
    });
  });

  test('parses owner/repo shorthand', () => {
    expect(parseGitHubRemoteUrl('owner/repo')).toEqual({
      owner: 'owner',
      repo: 'repo',
    });
  });

  test('rejects non-github urls and garbage', () => {
    expect(parseGitHubRemoteUrl('https://gitlab.com/owner/repo')).toBeNull();
    expect(parseGitHubRemoteUrl('not a url')).toBeNull();
    expect(parseGitHubRemoteUrl('')).toBeNull();
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
