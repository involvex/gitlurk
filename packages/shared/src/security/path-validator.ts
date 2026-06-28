import path from 'node:path';

const BLOCKED_PREFIXES = [
  'C:\\Windows',
  'C:\\Program Files',
  'C:\\Program Files (x86)',
];

export class PathValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathValidationError';
  }
}

export function normalizePath(input: string): string {
  return path.normalize(input.replace(/\//g, path.sep));
}

export function validateRepoPath(
  input: string,
  allowedRoots?: string[],
): string {
  if (!input || input.trim().length === 0) {
    throw new PathValidationError('Path must not be empty');
  }

  const normalized = normalizePath(input);
  const resolved = path.resolve(normalized);

  if (normalized.includes('..')) {
    throw new PathValidationError('Path must not contain .. segments');
  }

  for (const blocked of BLOCKED_PREFIXES) {
    if (resolved.toLowerCase().startsWith(blocked.toLowerCase())) {
      throw new PathValidationError('Path is in a blocked system directory');
    }
  }

  if (allowedRoots && allowedRoots.length > 0) {
    const allowed = allowedRoots.some((root) =>
      resolved.toLowerCase().startsWith(path.resolve(root).toLowerCase()),
    );
    if (!allowed) {
      throw new PathValidationError('Path is outside allowed roots');
    }
  }

  return resolved;
}

export function validateNewRepoDir(input: string): string {
  const resolved = validateRepoPath(input);
  return resolved;
}
