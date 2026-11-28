import { describe, expect, test } from 'bun:test';
import { isGitTruthy, normalizeGpgFormat } from '../gpg-config';

describe('isGitTruthy', () => {
  test('accepts common true spellings', () => {
    expect(isGitTruthy('true')).toBe(true);
    expect(isGitTruthy('TRUE')).toBe(true);
    expect(isGitTruthy('1')).toBe(true);
    expect(isGitTruthy('yes')).toBe(true);
    expect(isGitTruthy('on')).toBe(true);
  });

  test('rejects falsey values', () => {
    expect(isGitTruthy(null)).toBe(false);
    expect(isGitTruthy('')).toBe(false);
    expect(isGitTruthy('false')).toBe(false);
    expect(isGitTruthy('0')).toBe(false);
  });
});

describe('normalizeGpgFormat', () => {
  test('maps known formats', () => {
    expect(normalizeGpgFormat('ssh')).toBe('ssh');
    expect(normalizeGpgFormat('openpgp')).toBe('openpgp');
    expect(normalizeGpgFormat('gpg')).toBe('openpgp');
    expect(normalizeGpgFormat(null)).toBe('');
    expect(normalizeGpgFormat('other')).toBe('');
  });
});
