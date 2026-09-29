export type ExternalToolTarget = 'repo' | 'file';
export type ExternalToolKind = 'native' | 'wsl';

export type ExternalTool = {
  id: string;
  label: string;
  enabled: boolean;
  targets: ExternalToolTarget[];
  kind: ExternalToolKind;
  command: string;
  args: string[];
  builtin: boolean;
};

export const BUILTIN_TOOL_IDS = [
  'vscode',
  'cursor',
  'antigravity',
  'origin-wsl',
  'wsl',
] as const;

export function defaultExternalTools(): ExternalTool[] {
  return [
    {
      id: 'vscode',
      label: 'Open in VS Code',
      enabled: false,
      targets: ['repo', 'file'],
      kind: 'native',
      command: 'code',
      args: ['{path}'],
      builtin: true,
    },
    {
      id: 'cursor',
      label: 'Open in Cursor',
      enabled: false,
      targets: ['repo', 'file'],
      kind: 'native',
      command: 'cursor',
      args: ['{path}'],
      builtin: true,
    },
    {
      id: 'antigravity',
      label: 'Open in Antigravity',
      enabled: false,
      targets: ['repo', 'file'],
      kind: 'native',
      command: 'antigravity',
      args: ['{path}'],
      builtin: true,
    },
    {
      id: 'origin-wsl',
      label: 'Open in WSL (Origin)',
      enabled: false,
      targets: ['repo'],
      kind: 'wsl',
      command: 'wsl',
      args: [
        'export PATH="$HOME/.local/bin:$PATH"; cd \'{wslPath}\' && exec bash -l',
      ],
      builtin: true,
    },
    {
      id: 'wsl',
      label: 'Open in WSL',
      enabled: false,
      targets: ['repo'],
      kind: 'wsl',
      command: 'wsl',
      args: ["cd '{wslPath}' && exec bash -l"],
      builtin: true,
    },
  ];
}

/** Convert a Windows path to a WSL `/mnt/<drive>/…` path. */
export function toWslPath(windowsPath: string): string {
  const normalized = windowsPath.replace(/\\/g, '/');
  const match = /^([A-Za-z]):\/(.*)$/.exec(normalized);
  if (!match) {
    throw new Error(`Cannot convert path to WSL: ${windowsPath}`);
  }
  const drive = match[1]!.toLowerCase();
  const rest = match[2]!.replace(/\/+/g, '/').replace(/\/$/, '');
  return rest ? `/mnt/${drive}/${rest}` : `/mnt/${drive}`;
}

export function substitutePlaceholders(
  template: string,
  values: {
    path: string;
    dir: string;
    fileName: string;
    wslPath: string;
  },
): string {
  return template
    .replaceAll('{path}', values.path)
    .replaceAll('{dir}', values.dir)
    .replaceAll('{fileName}', values.fileName)
    .replaceAll('{wslPath}', values.wslPath);
}

export function toolsForTarget(
  tools: ExternalTool[],
  target: ExternalToolTarget,
): ExternalTool[] {
  return tools.filter((t) => t.enabled && t.targets.includes(target));
}

/** Restore builtin presets while keeping custom tools. */
export function resetBuiltinTools(current: ExternalTool[]): ExternalTool[] {
  const customs = current.filter((t) => !t.builtin);
  return [...defaultExternalTools(), ...customs];
}

export function menuItemsForTools(
  tools: ExternalTool[],
  target: ExternalToolTarget,
): Array<{ id: string; label: string }> {
  return toolsForTarget(tools, target).map((t) => ({
    id: `tool:${t.id}`,
    label: t.label,
  }));
}
