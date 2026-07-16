import { describe, expect, test } from 'bun:test';

// Parsing logic mirrored for unit testing without spawning git.
function parseConfigLine(line: string): {
  key: string;
  value: string;
  origin?: string;
} | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const originMatch = trimmed.match(/^file:(.+?)\s+(.+)$/);
  if (originMatch) {
    const rest = originMatch[2] ?? '';
    const eq = rest.indexOf('=');
    if (eq === -1) return null;
    return {
      origin: originMatch[1],
      key: rest.slice(0, eq),
      value: rest.slice(eq + 1),
    };
  }

  const eq = trimmed.indexOf('=');
  if (eq === -1) return null;
  return {
    key: trimmed.slice(0, eq),
    value: trimmed.slice(eq + 1),
  };
}

describe('git config parsing', () => {
  test('parses simple key=value', () => {
    expect(parseConfigLine('user.name=Alice')).toEqual({
      key: 'user.name',
      value: 'Alice',
    });
  });

  test('parses show-origin lines', () => {
    expect(
      parseConfigLine('file:C:/Users/me/.gitconfig\tuser.email=a@b.com'),
    ).toEqual({
      origin: 'C:/Users/me/.gitconfig',
      key: 'user.email',
      value: 'a@b.com',
    });
  });
});
