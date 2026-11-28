/**
 * Git difftool / mergetool presets for Settings.
 * Values keep git's `$LOCAL` / `$REMOTE` / `$BASE` / `$MERGED` tokens —
 * they are substituted by git, not by shell:run-tool placeholders.
 */

export type DiffMergePresetEntry = {
  key: string;
  value: string;
};

export type DiffMergePreset = {
  id: string;
  label: string;
  description: string;
  /** Builtin ExternalTool id to enable when this preset is applied. */
  externalToolId?: string;
  gitConfig: DiffMergePresetEntry[];
};

function toolConfigs(
  name: string,
  diffCmd: string,
  mergeCmd: string,
): DiffMergePresetEntry[] {
  return [
    { key: 'diff.tool', value: name },
    { key: `difftool.${name}.cmd`, value: diffCmd },
    { key: 'merge.tool', value: name },
    { key: `mergetool.${name}.cmd`, value: mergeCmd },
    { key: `mergetool.${name}.trustExitCode`, value: 'true' },
    { key: 'difftool.prompt', value: 'false' },
  ];
}

export function diffMergePresets(): DiffMergePreset[] {
  return [
    {
      id: 'vscode',
      label: 'VS Code',
      description: 'code --wait --diff / --merge',
      externalToolId: 'vscode',
      gitConfig: toolConfigs(
        'vscode',
        'code --wait --diff "$LOCAL" "$REMOTE"',
        'code --wait --merge "$REMOTE" "$LOCAL" "$BASE" "$MERGED"',
      ),
    },
    {
      id: 'cursor',
      label: 'Cursor',
      description: 'cursor --wait --diff / --merge',
      externalToolId: 'cursor',
      gitConfig: toolConfigs(
        'cursor',
        'cursor --wait --diff "$LOCAL" "$REMOTE"',
        'cursor --wait --merge "$REMOTE" "$LOCAL" "$BASE" "$MERGED"',
      ),
    },
    {
      id: 'winmerge',
      label: 'WinMerge',
      description: 'WinMergeU.exe (default install path)',
      gitConfig: toolConfigs(
        'winmerge',
        '"C:/Program Files/WinMerge/WinMergeU.exe" -e -u "$LOCAL" "$REMOTE"',
        '"C:/Program Files/WinMerge/WinMergeU.exe" -e -u -dl "Local" -dr "Remote" "$LOCAL" "$REMOTE" -o "$MERGED"',
      ),
    },
    {
      id: 'beyond-compare',
      label: 'Beyond Compare',
      description: 'BCompare.exe (default BC4 path)',
      gitConfig: toolConfigs(
        'bc4',
        '"C:/Program Files/Beyond Compare 4/BCompare.exe" "$LOCAL" "$REMOTE"',
        '"C:/Program Files/Beyond Compare 4/BCompare.exe" "$LOCAL" "$REMOTE" "$BASE" "$MERGED"',
      ),
    },
    {
      id: 'meld',
      label: 'Meld',
      description: 'meld on PATH',
      gitConfig: toolConfigs(
        'meld',
        'meld "$LOCAL" "$REMOTE"',
        'meld "$LOCAL" "$BASE" "$REMOTE" --output="$MERGED"',
      ),
    },
  ];
}

export function findDiffMergePreset(id: string): DiffMergePreset | undefined {
  return diffMergePresets().find((p) => p.id === id);
}
