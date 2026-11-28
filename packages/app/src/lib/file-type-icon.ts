export type FileIconId =
  | 'folder'
  | 'folder-open'
  | 'typescript'
  | 'javascript'
  | 'json'
  | 'markdown'
  | 'rust'
  | 'css'
  | 'html'
  | 'image'
  | 'lock'
  | 'git'
  | 'yaml'
  | 'toml'
  | 'env'
  | 'python'
  | 'shell'
  | 'generic';

const EXT_MAP: Record<string, FileIconId> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  jsonc: 'json',
  md: 'markdown',
  mdx: 'markdown',
  markdown: 'markdown',
  rs: 'rust',
  css: 'css',
  scss: 'css',
  less: 'css',
  html: 'html',
  htm: 'html',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  svg: 'image',
  ico: 'image',
  lock: 'lock',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  py: 'python',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  ps1: 'shell',
  bat: 'shell',
  cmd: 'shell',
};

const NAME_MAP: Record<string, FileIconId> = {
  '.gitignore': 'git',
  '.gitattributes': 'git',
  '.gitmodules': 'git',
  '.env': 'env',
  '.env.local': 'env',
  '.env.example': 'env',
  'cargo.lock': 'lock',
  'package-lock.json': 'lock',
  'pnpm-lock.yaml': 'lock',
  'bun.lock': 'lock',
  'bun.lockb': 'lock',
  'yarn.lock': 'lock',
  dockerfile: 'shell',
  'docker-compose.yml': 'yaml',
  'docker-compose.yaml': 'yaml',
};

/** Map a tree entry name/kind to a small icon id for the file explorer. */
export function resolveFileIcon(
  name: string,
  kind: 'file' | 'dir',
  open = false,
): FileIconId {
  if (kind === 'dir') return open ? 'folder-open' : 'folder';

  const lower = name.toLowerCase();
  if (NAME_MAP[lower]) return NAME_MAP[lower];

  const dot = lower.lastIndexOf('.');
  if (dot > 0 && dot < lower.length - 1) {
    const ext = lower.slice(dot + 1);
    if (EXT_MAP[ext]) return EXT_MAP[ext];
  }

  if (lower.endsWith('.lock')) return 'lock';
  return 'generic';
}
