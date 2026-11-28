import { describe, expect, test } from 'bun:test';
import { resolveFileIcon } from '../file-type-icon';

describe('resolveFileIcon', () => {
  test('folders respect open state', () => {
    expect(resolveFileIcon('src', 'dir')).toBe('folder');
    expect(resolveFileIcon('src', 'dir', true)).toBe('folder-open');
  });

  test('maps common extensions', () => {
    expect(resolveFileIcon('App.tsx', 'file')).toBe('typescript');
    expect(resolveFileIcon('index.js', 'file')).toBe('javascript');
    expect(resolveFileIcon('README.md', 'file')).toBe('markdown');
    expect(resolveFileIcon('main.rs', 'file')).toBe('rust');
    expect(resolveFileIcon('photo.PNG', 'file')).toBe('image');
  });

  test('maps special filenames', () => {
    expect(resolveFileIcon('.gitignore', 'file')).toBe('git');
    expect(resolveFileIcon('.env.local', 'file')).toBe('env');
    expect(resolveFileIcon('package-lock.json', 'file')).toBe('lock');
  });

  test('falls back to generic', () => {
    expect(resolveFileIcon('notes.xyz', 'file')).toBe('generic');
    expect(resolveFileIcon('LICENSE', 'file')).toBe('generic');
  });
});
