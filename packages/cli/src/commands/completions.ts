const SUPPORTED_SHELLS = ['powershell'] as const;
type Shell = (typeof SUPPORTED_SHELLS)[number];

function isShell(value: string | undefined): value is Shell {
  return (
    value !== undefined &&
    (SUPPORTED_SHELLS as readonly string[]).includes(value)
  );
}

function printCompletionsUsage(): void {
  console.log(`Usage:
  gitlurk completions <shell>

Shells:
  powershell

Install (PowerShell profile):
  gitlurk completions powershell | Out-String | Invoke-Expression

Or persist:
  gitlurk completions powershell >> $PROFILE
`);
}

function powershellScript(): string {
  // Native completer: filter by current word; emit CompletionResult rows.
  return `# gitlurk PowerShell completions
# Add to your profile: gitlurk completions powershell | Out-String | Invoke-Expression

Register-ArgumentCompleter -Native -CommandName gitlurk -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)

  $elements = @($commandAst.CommandElements | ForEach-Object { $_.Extent.Text })
  if ($elements.Count -eq 0 -or $elements[0] -ne 'gitlurk') { return }

  $tokens = @($elements | Select-Object -Skip 1)
  if ($wordToComplete -and $tokens.Count -gt 0 -and $tokens[-1] -eq $wordToComplete) {
    $tokens = @($tokens | Select-Object -SkipLast 1)
  }

  function Emit([string[]]$Items) {
    $Items |
      Where-Object { $_ -like "$wordToComplete*" } |
      ForEach-Object {
        [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
      }
  }

  if ($tokens.Count -eq 0) {
    Emit @(
      'open', 'clone', 'url', 'gh', 'runs', 'watch', 'fork', 'repo', 'release',
      'alias', 'config', 'skill', 'git', 'install-desktop', 'completions', 'help',
      '--help', '--version', '-h', '-V'
    )
    return
  }

  $cmd = $tokens[0]

  switch -Regex ($cmd) {
    '^(open|clone|url|watch|fork|alias|config|skill|install-desktop|help)$' {
      return
    }
    '^gh$' {
      # Defer to file/path completion for gh passthrough args
      return
    }
    '^runs$' {
      Emit @('--limit', '--json', '--workflow')
      return
    }
    '^repo$' {
      if ($tokens.Count -eq 1) { Emit @('edit'); return }
      return
    }
    '^release$' {
      if ($tokens.Count -eq 1) { Emit @('create'); return }
      return
    }
    '^git$' {
      if ($tokens.Count -eq 1) { Emit @('config'); return }
      if ($tokens.Count -eq 2 -and $tokens[1] -eq 'config') {
        Emit @('list', 'get', 'set', 'edit')
        return
      }
      if ($tokens.Count -ge 3 -and $tokens[1] -eq 'config') {
        Emit @('--global', '--local', '--system')
        return
      }
      return
    }
    '^completions$' {
      if ($tokens.Count -eq 1) { Emit @('powershell'); return }
      return
    }
    default { return }
  }
}
`;
}

export function runCompletionsCommand(args: string[]): void {
  // args[0] is "completions"
  const shell = args[1];

  if (!shell || shell === '-h' || shell === '--help') {
    printCompletionsUsage();
    return;
  }

  if (!isShell(shell)) {
    console.error(
      `Unsupported shell: ${shell}\nSupported: ${SUPPORTED_SHELLS.join(', ')}`,
    );
    process.exit(1);
  }

  if (shell === 'powershell') {
    process.stdout.write(powershellScript());
  }
}

export function isCompletionsCommand(command: string | undefined): boolean {
  return command === 'completions' || command === 'completion';
}
