export function printUsage(): void {
  console.log(`GitLurk CLI

Usage:
  gitlurk [--help] [--version]
  gitlurk                       Open current directory in GitLurk Desktop
  gitlurk .                     Same as above (resolved absolute path)
  gitlurk open <path>           Open local repository
  gitlurk clone <url>           Clone repository
  gitlurk url <repo-url> [branch]  Open via protocol handler

GitHub CLI (requires gh: https://cli.github.com):
  gitlurk gh <args...>          Passthrough to gh
  gitlurk runs [flags]          gh run list
  gitlurk watch [run-id]        gh run watch
  gitlurk fork [repo]           gh repo fork
  gitlurk repo edit ...         gh repo edit
  gitlurk release create ...    gh release create
  gitlurk alias ...             gh alias
  gitlurk config ...            gh config
  gitlurk skill ...             gh skill

Git config:
  gitlurk git config list [--global|--local|--system]
  gitlurk git config get <key> [--global|--local]
  gitlurk git config set <key> <value> [--global|--local]
  gitlurk git config edit [--global|--local]

Env:
  GITLURK_DESKTOP_EXE           Path to gitlurk-desktop.exe (optional)
  CARGO_TARGET_DIR              Cargo target dir; uses release/ then debug/

Install:
  bun link                       (from repo root) — uses the root package.json "bin" field

If no exe is found, falls back to:
  bun run --filter @gitlurk/app tauri dev --release --no-watch -- <arg>
`);
}
