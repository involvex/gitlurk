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
import {
  defaultExternalTools,
  menuItemsForTools,
  resetBuiltinTools,
  substitutePlaceholders,
  toWslPath,
  toolsForTarget,
} from '../external-tools.js';

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

describe('external tools', () => {
  test('toWslPath converts drive paths', () => {
    expect(toWslPath('C:\\Users\\a\\repo')).toBe('/mnt/c/Users/a/repo');
    expect(toWslPath('D:/foo/bar')).toBe('/mnt/d/foo/bar');
  });

  test('substitutePlaceholders replaces all tokens', () => {
    expect(
      substitutePlaceholders('{path}|{dir}|{fileName}|{wslPath}', {
        path: 'D:\\r\\f.txt',
        dir: 'D:\\r',
        fileName: 'f.txt',
        wslPath: '/mnt/d/r/f.txt',
      }),
    ).toBe('D:\\r\\f.txt|D:\\r|f.txt|/mnt/d/r/f.txt');
  });

  test('toolsForTarget filters enabled tools', () => {
    const tools = defaultExternalTools();
    tools.find((t) => t.id === 'vscode')!.enabled = true;
    tools.find((t) => t.id === 'cursor')!.enabled = true;
    tools.find((t) => t.id === 'origin-wsl')!.enabled = true;
    tools.find((t) => t.id === 'vscode')!.enabled = false;
    const repo = toolsForTarget(tools, 'repo');
    expect(repo.some((t) => t.id === 'vscode')).toBe(false);
    expect(repo.some((t) => t.id === 'cursor')).toBe(true);
    expect(repo.some((t) => t.id === 'origin-wsl')).toBe(true);
    const file = toolsForTarget(tools, 'file');
    expect(file.some((t) => t.id === 'origin-wsl')).toBe(false);
  });

  test('resetBuiltinTools keeps customs', () => {
    const custom = {
      id: 'custom-1',
      label: 'Open in Foo',
      enabled: true,
      targets: ['repo' as const],
      kind: 'native' as const,
      command: 'foo',
      args: ['{path}'],
      builtin: false,
    };
    const tools = defaultExternalTools();
    tools.find((t) => t.id === 'vscode')!.enabled = true;
    const reset = resetBuiltinTools([...tools, custom]);
    expect(reset.find((t) => t.id === 'vscode')?.enabled).toBe(false);
    expect(reset.some((t) => t.id === 'custom-1')).toBe(true);
  });

  test('menuItemsForTools prefixes ids', () => {
    const tools = defaultExternalTools().map((t) => ({ ...t, enabled: true }));
    const items = menuItemsForTools(tools, 'file');
    expect(items.every((i) => i.id.startsWith('tool:'))).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });
});
