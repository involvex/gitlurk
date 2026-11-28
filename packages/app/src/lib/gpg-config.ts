export type GpgFormat = 'openpgp' | 'ssh' | '';

/** Parse common git config boolean spellings. */
export function isGitTruthy(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/** Normalize `gpg.format` from git config. */
export function normalizeGpgFormat(
  value: string | null | undefined,
): GpgFormat {
  const v = (value ?? '').trim().toLowerCase();
  if (v === 'ssh') return 'ssh';
  if (v === 'openpgp' || v === 'gpg') return 'openpgp';
  return '';
}
